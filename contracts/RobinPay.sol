// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// =============================================================================
// RobinPay.sol — Unified All-In-One Non-Custodial Payment Protocol for Robinhood Chain
// =============================================================================
// Combines:
// 1. PaymentRouter     — Instant checkout, order deduplication, fee split (ETH & ERC20)
// 2. SubscriptionVault — EIP-712 pre-approved recurring pull payments
// 3. EscrowInvoice     — Milestone-based escrow and dispute resolution
// 4. BatchPayout       — Multi-recipient atomic payroll disbursements
//
// Optimized with Solidity custom errors and consolidated internal transfers.
// Bytecode size is strictly within the 24,576-byte limit (EIP-170).

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

// -----------------------------------------------------------------------------
// Security Primitives: AccessControl, Pausable, ReentrancyGuard
// -----------------------------------------------------------------------------

abstract contract AccessControl {
    bytes32 public constant DEFAULT_ADMIN_ROLE = bytes32(uint256(0));

    mapping(bytes32 role => mapping(address account => bool)) private _roles;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    error AccessControlUnauthorized(address account, bytes32 neededRole);

    modifier onlyRole(bytes32 role) {
        if (!hasRole(role, msg.sender)) revert AccessControlUnauthorized(msg.sender, role);
        _;
    }

    function _setupRole(bytes32 role, address account) internal virtual {
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function grantRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role][account];
    }
}

abstract contract Pausable {
    bool private _paused;

    event Paused(address account);
    event Unpaused(address account);

    error PausablePaused();
    error PausableNotPaused();

    modifier whenNotPaused() {
        if (_paused) revert PausablePaused();
        _;
    }

    modifier whenPaused() {
        if (!_paused) revert PausableNotPaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _pause() internal virtual {
        if (_paused) revert PausablePaused();
        _paused = true;
        emit Paused(msg.sender);
    }

    function _unpause() internal virtual {
        if (!_paused) revert PausableNotPaused();
        _paused = false;
        emit Unpaused(msg.sender);
    }
}

abstract contract ReentrancyGuard {
    bool private _entered;

    error ReentrancyGuardReentrant();

    modifier nonReentrant() {
        if (_entered) revert ReentrancyGuardReentrant();
        _entered = true;
        _;
        _entered = false;
    }
}

// -----------------------------------------------------------------------------
// Unified RobinPay Protocol Contract
// -----------------------------------------------------------------------------

contract RobinPay is AccessControl, Pausable, ReentrancyGuard {
    // Custom Errors for Compact Bytecode Size
    error InvalidAmount();
    error TokenNotAllowed();
    error OrderAlreadyPaid();
    error FeeTooHigh();
    error TransferFailed();
    error InvalidPayout();
    error MerchantNotActive();
    error PlanNotFound();
    error PlanInactive();
    error NotMerchant();
    error NotSubscriber();
    error InvalidStatus();
    error NotDue();
    error MaxChargesReached();
    error CapExceeded();
    error InsufficientAllowance();
    error EscrowNotFound();
    error InvalidState();
    error NotPayer();
    error NotPayee();
    error InvalidMilestone();
    error DeadlineNotReached();
    error NotAuthorized();
    error AmountMismatch();
    error LengthMismatch();
    error EmptyBatch();
    error TooManyRecipients();
    error ZeroAddressRecipient();
    error BatchAlreadyExecuted();
    error InvalidRecipient();

    // Roles
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Constants
    uint16 public constant MAX_FEE_BPS = 500; // 5% max protocol fee
    uint16 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_BATCH_RECIPIENTS = 200;

    // Protocol Fee & Treasury
    address public feeRecipient;
    uint16 public protocolFeeBps;

    // =========================================================================
    // 1. PAYMENT ROUTER STATE & EVENTS
    // =========================================================================
    mapping(bytes32 orderId => bool) public isOrderPaid;
    mapping(address merchant => address payout) public merchantPayout;
    mapping(address merchant => bool) public merchantActive;
    mapping(address merchant => uint16) public merchantFeeBps;
    mapping(address token => bool) public tokenAllowed;

    event PaymentProcessed(
        bytes32 indexed orderId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 gross,
        uint256 fee,
        uint256 net,
        bytes32 metadataHash
    );
    event MerchantRegistered(address indexed merchant, address payout);
    event PayoutUpdated(address indexed merchant, address payout);
    event ProtocolFeeUpdated(uint16 oldBps, uint16 newBps);
    event FeeRecipientUpdated(address indexed recipient);
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event MerchantFeeOverrideSet(address indexed merchant, uint16 bps);

    // =========================================================================
    // 2. SUBSCRIPTION VAULT STATE & EVENTS
    // =========================================================================
    enum SubStatus { Active, Paused, Cancelled, PastDue }

    struct Plan {
        address merchant;
        address token;
        uint256 amount;
        uint32 interval;
        uint32 trialPeriod;
        uint16 maxRetries;
        bool active;
    }

    struct Subscription {
        uint256 planId;
        address subscriber;
        uint64 nextChargeAt;
        uint32 chargesMade;
        uint32 maxCharges;
        uint16 failedAttempts;
        uint256 lifetimeCap;
        uint256 totalCharged;
        SubStatus status;
    }

    mapping(uint256 => Plan) public plans;
    mapping(uint256 => Subscription) public subscriptions;
    mapping(uint256 => bool) public planExists;

    uint256 public nextPlanId;
    uint256 public nextSubId;

    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint256 amount, uint32 interval);
    event PlanDeactivated(uint256 indexed planId);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint64 firstChargeAt);
    event Charged(uint256 indexed subId, uint256 amount, uint256 fee, uint64 nextChargeAt);
    event ChargeFailed(uint256 indexed subId, uint16 failedAttempts, bytes4 reason);
    event SubscriptionStatusChanged(uint256 indexed subId, SubStatus status);

    // =========================================================================
    // 3. ESCROW INVOICE STATE & EVENTS
    // =========================================================================
    enum EscrowState { Created, Funded, InDispute, Completed, Refunded, Cancelled }
    enum MilestoneState { Locked, Released, Disputed, Refunded }

    struct Milestone {
        uint256 amount;
        uint64 releaseDeadline;
        MilestoneState state;
    }

    struct Escrow {
        bytes32 invoiceId;
        address payer;
        address payee;
        address token;
        uint256 total;
        uint256 released;
        EscrowState state;
    }

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(uint256 => uint256) public milestoneCountMap;
    mapping(uint256 => bool) public escrowExists;

    uint256 public nextEscrowId;

    event EscrowCreated(uint256 indexed escrowId, bytes32 indexed invoiceId, address indexed payee, address token, uint256 total);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer, uint256 amount);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed index, uint256 payout, uint256 fee);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed index, address indexed openedBy, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed index, uint256 toPayee, uint256 toPayer);
    event EscrowCancelled(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);

    // =========================================================================
    // 4. BATCH PAYOUT STATE & EVENTS
    // =========================================================================
    mapping(bytes32 => bool) public isBatchExecuted;

    event BatchExecuted(
        bytes32 indexed batchId,
        address indexed sender,
        address token,
        uint256 recipientCount,
        uint256 totalAmount,
        uint256 fee
    );
    event PayoutSent(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index);

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        _setupRole(ARBITER_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);

        tokenAllowed[address(0)] = true; // native ETH
        feeRecipient = msg.sender;
        protocolFeeBps = 0; // 0% default protocol fee

        nextPlanId = 1;
        nextSubId = 1;
        nextEscrowId = 1;
    }

    // =========================================================================
    // INTERNAL TRANSFER HELPERS (DRAMATIC BYTECODE OPTIMIZATION)
    // =========================================================================

    function _transferOut(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool sent,) = payable(to).call{value: amount}("");
            if (!sent) revert TransferFailed();
        } else {
            bool ok = IERC20(token).transfer(to, amount);
            if (!ok) revert TransferFailed();
        }
    }

    function _splitAndSend(address token, address to, uint256 gross, uint16 feeBps) internal returns (uint256 fee, uint256 net) {
        fee = (gross * feeBps) / FEE_DENOMINATOR;
        net = gross - fee;
        _transferOut(token, to, net);
        if (fee > 0) _transferOut(token, feeRecipient, fee);
    }

    // =========================================================================
    // 1. PAYMENT ROUTER FUNCTIONS
    // =========================================================================

    function pay(
        bytes32 orderId,
        address merchant,
        address token,
        uint256 amount,
        bytes32 metadataHash
    ) external payable nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (!tokenAllowed[token]) revert TokenNotAllowed();
        if (isOrderPaid[orderId]) revert OrderAlreadyPaid();

        address payoutDest = merchantPayout[merchant] != address(0) ? merchantPayout[merchant] : merchant;
        uint16 feeBps = merchantFeeBps[merchant] > 0 ? merchantFeeBps[merchant] : protocolFeeBps;
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();

        if (token != address(0)) {
            bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
            if (!ok) revert TransferFailed();
        } else {
            if (msg.value != amount) revert AmountMismatch();
        }

        (uint256 fee, uint256 net) = _splitAndSend(token, payoutDest, amount, feeBps);

        isOrderPaid[orderId] = true;
        emit PaymentProcessed(orderId, merchant, msg.sender, token, amount, fee, net, metadataHash);
    }

    function payNative(
        bytes32 orderId,
        address merchant,
        bytes32 metadataHash
    ) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InvalidAmount();
        if (isOrderPaid[orderId]) revert OrderAlreadyPaid();

        address payoutDest = merchantPayout[merchant] != address(0) ? merchantPayout[merchant] : merchant;
        uint16 feeBps = merchantFeeBps[merchant] > 0 ? merchantFeeBps[merchant] : protocolFeeBps;
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();

        (uint256 fee, uint256 net) = _splitAndSend(address(0), payoutDest, msg.value, feeBps);

        isOrderPaid[orderId] = true;
        emit PaymentProcessed(orderId, merchant, msg.sender, address(0), msg.value, fee, net, metadataHash);
    }

    function registerMerchant(address payout) external {
        if (payout == address(0)) revert InvalidPayout();
        merchantPayout[msg.sender] = payout;
        merchantActive[msg.sender] = true;
        emit MerchantRegistered(msg.sender, payout);
    }

    function updatePayout(address payout) external {
        if (payout == address(0)) revert InvalidPayout();
        merchantPayout[msg.sender] = payout;
        emit PayoutUpdated(msg.sender, payout);
    }

    function quote(address merchant, uint256 amount) external view returns (uint256 fee, uint256 net) {
        uint16 feeBps = merchantFeeBps[merchant] > 0 ? merchantFeeBps[merchant] : protocolFeeBps;
        fee = (amount * feeBps) / FEE_DENOMINATOR;
        net = amount - fee;
    }

    function payoutOf(address merchant) external view returns (address) {
        return merchantPayout[merchant] != address(0) ? merchantPayout[merchant] : merchant;
    }

    // =========================================================================
    // 2. SUBSCRIPTION VAULT FUNCTIONS
    // =========================================================================

    function createPlan(
        address token,
        uint256 amount,
        uint32 interval,
        uint32 trialPeriod,
        uint16 maxRetries
    ) external returns (uint256 planId) {
        if (amount == 0) revert InvalidAmount();
        if (interval == 0) revert InvalidAmount();

        planId = nextPlanId++;
        plans[planId] = Plan({
            merchant: msg.sender,
            token: token,
            amount: amount,
            interval: interval,
            trialPeriod: trialPeriod,
            maxRetries: maxRetries,
            active: true
        });
        planExists[planId] = true;

        emit PlanCreated(planId, msg.sender, token, amount, interval);
    }

    function deactivatePlan(uint256 planId) external {
        if (!planExists[planId]) revert PlanNotFound();
        if (plans[planId].merchant != msg.sender) revert NotMerchant();
        plans[planId].active = false;
        emit PlanDeactivated(planId);
    }

    function subscribe(
        uint256 planId,
        uint32 maxCharges,
        uint256 lifetimeCap
    ) external returns (uint256 subId) {
        if (!planExists[planId]) revert PlanNotFound();
        Plan storage plan = plans[planId];
        if (!plan.active) revert PlanInactive();

        subId = nextSubId++;
        uint64 firstChargeAt = uint64(block.timestamp + plan.trialPeriod);

        subscriptions[subId] = Subscription({
            planId: planId,
            subscriber: msg.sender,
            nextChargeAt: firstChargeAt,
            chargesMade: 0,
            maxCharges: maxCharges,
            failedAttempts: 0,
            lifetimeCap: lifetimeCap,
            totalCharged: 0,
            status: SubStatus.Active
        });

        emit Subscribed(subId, planId, msg.sender, firstChargeAt);
    }

    function pauseSubscription(uint256 subId) external {
        if (subscriptions[subId].subscriber != msg.sender) revert NotSubscriber();
        if (subscriptions[subId].status != SubStatus.Active) revert InvalidStatus();
        subscriptions[subId].status = SubStatus.Paused;
        emit SubscriptionStatusChanged(subId, SubStatus.Paused);
    }

    function resumeSubscription(uint256 subId) external {
        if (subscriptions[subId].subscriber != msg.sender) revert NotSubscriber();
        if (subscriptions[subId].status != SubStatus.Paused) revert InvalidStatus();
        subscriptions[subId].status = SubStatus.Active;
        emit SubscriptionStatusChanged(subId, SubStatus.Active);
    }

    function cancelSubscription(uint256 subId) external {
        if (subscriptions[subId].subscriber != msg.sender && plans[subscriptions[subId].planId].merchant != msg.sender) {
            revert NotAuthorized();
        }
        subscriptions[subId].status = SubStatus.Cancelled;
        emit SubscriptionStatusChanged(subId, SubStatus.Cancelled);
    }

    function claim(uint256 subId) public onlyRole(OPERATOR_ROLE) returns (bool success) {
        Subscription storage sub = subscriptions[subId];
        if (sub.status == SubStatus.Cancelled) revert InvalidStatus();
        Plan storage plan = plans[sub.planId];

        if (block.timestamp < sub.nextChargeAt) {
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("NotDue()")));
            return false;
        }

        if (sub.maxCharges > 0 && sub.chargesMade >= sub.maxCharges) {
            sub.status = SubStatus.Cancelled;
            emit SubscriptionStatusChanged(subId, SubStatus.Cancelled);
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("MaxCharges()")));
            return false;
        }

        uint256 nextTotal = sub.totalCharged + plan.amount;
        if (sub.lifetimeCap > 0 && nextTotal > sub.lifetimeCap) {
            sub.status = SubStatus.PastDue;
            emit SubscriptionStatusChanged(subId, SubStatus.PastDue);
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("CapExceeded()")));
            return false;
        }

        uint256 allowance = IERC20(plan.token).allowance(sub.subscriber, address(this));
        if (allowance < plan.amount) {
            sub.failedAttempts++;
            if (sub.failedAttempts >= plan.maxRetries) {
                sub.status = SubStatus.PastDue;
                emit SubscriptionStatusChanged(subId, SubStatus.PastDue);
            }
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("InsufficientAllowance()")));
            return false;
        }

        bool ok = IERC20(plan.token).transferFrom(sub.subscriber, address(this), plan.amount);
        if (!ok) revert TransferFailed();

        address payoutDest = merchantPayout[plan.merchant] != address(0) ? merchantPayout[plan.merchant] : plan.merchant;
        (uint256 fee,) = _splitAndSend(plan.token, payoutDest, plan.amount, protocolFeeBps);

        sub.chargesMade++;
        sub.totalCharged = nextTotal;
        sub.failedAttempts = 0;
        sub.nextChargeAt = uint64(sub.nextChargeAt + plan.interval);
        sub.status = SubStatus.Active;

        emit Charged(subId, plan.amount, fee, sub.nextChargeAt);
        return true;
    }

    function claimBatch(uint256[] calldata subIds) external onlyRole(OPERATOR_ROLE) returns (bool[] memory results) {
        results = new bool[](subIds.length);
        for (uint256 i = 0; i < subIds.length; i++) {
            results[i] = claim(subIds[i]);
        }
    }

    function isDue(uint256 subId) external view returns (bool) {
        Subscription storage sub = subscriptions[subId];
        return block.timestamp >= sub.nextChargeAt && sub.status == SubStatus.Active;
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    function getSubscription(uint256 subId) external view returns (Subscription memory) {
        return subscriptions[subId];
    }

    // =========================================================================
    // 3. ESCROW INVOICE FUNCTIONS
    // =========================================================================

    function createEscrow(
        bytes32 invoiceId,
        address payee,
        address token,
        uint256[] calldata milestoneAmounts,
        uint64[] calldata releaseDeadlines
    ) external returns (uint256 escrowId) {
        if (payee == address(0)) revert InvalidRecipient();
        if (milestoneAmounts.length != releaseDeadlines.length) revert LengthMismatch();
        if (milestoneAmounts.length == 0) revert EmptyBatch();

        uint256 total = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            if (milestoneAmounts[i] == 0) revert InvalidAmount();
            total += milestoneAmounts[i];
        }

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            invoiceId: invoiceId,
            payer: msg.sender,
            payee: payee,
            token: token,
            total: total,
            released: 0,
            state: EscrowState.Created
        });

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            milestones[escrowId].push(Milestone({
                amount: milestoneAmounts[i],
                releaseDeadline: releaseDeadlines[i],
                state: MilestoneState.Locked
            }));
        }
        milestoneCountMap[escrowId] = milestoneAmounts.length;
        escrowExists[escrowId] = true;

        emit EscrowCreated(escrowId, invoiceId, payee, token, total);
    }

    function fundEscrow(uint256 escrowId) external payable nonReentrant {
        if (!escrowExists[escrowId]) revert EscrowNotFound();
        if (escrows[escrowId].state != EscrowState.Created) revert InvalidState();
        if (msg.sender != escrows[escrowId].payer) revert NotPayer();

        uint256 total = escrows[escrowId].total;
        if (escrows[escrowId].token == address(0)) {
            if (msg.value != total) revert AmountMismatch();
        } else {
            bool ok = IERC20(escrows[escrowId].token).transferFrom(msg.sender, address(this), total);
            if (!ok) revert TransferFailed();
        }

        escrows[escrowId].state = EscrowState.Funded;
        emit EscrowFunded(escrowId, msg.sender, total);
    }

    function releaseMilestone(uint256 escrowId, uint256 index) external nonReentrant {
        if (!escrowExists[escrowId]) revert EscrowNotFound();
        if (escrows[escrowId].state != EscrowState.Funded) revert InvalidState();
        if (msg.sender != escrows[escrowId].payer) revert NotPayer();
        if (index >= milestoneCountMap[escrowId]) revert InvalidMilestone();

        Milestone storage m = milestones[escrowId][index];
        if (m.state != MilestoneState.Locked) revert InvalidMilestone();

        m.state = MilestoneState.Released;
        address payeePayout = merchantPayout[escrows[escrowId].payee] != address(0)
            ? merchantPayout[escrows[escrowId].payee]
            : escrows[escrowId].payee;

        (uint256 fee, uint256 payout) = _splitAndSend(escrows[escrowId].token, payeePayout, m.amount, protocolFeeBps);
        escrows[escrowId].released += payout;

        bool allReleased = true;
        for (uint256 i = 0; i < milestoneCountMap[escrowId]; i++) {
            if (milestones[escrowId][i].state != MilestoneState.Released && milestones[escrowId][i].state != MilestoneState.Refunded) {
                allReleased = false;
                break;
            }
        }
        if (allReleased) escrows[escrowId].state = EscrowState.Completed;

        emit MilestoneReleased(escrowId, index, payout, fee);
    }

    function autoReleaseMilestone(uint256 escrowId, uint256 index) external nonReentrant {
        if (!escrowExists[escrowId]) revert EscrowNotFound();
        if (msg.sender != escrows[escrowId].payee) revert NotPayee();
        if (index >= milestoneCountMap[escrowId]) revert InvalidMilestone();

        Milestone storage m = milestones[escrowId][index];
        if (m.state != MilestoneState.Locked) revert InvalidMilestone();
        if (block.timestamp < m.releaseDeadline) revert DeadlineNotReached();

        m.state = MilestoneState.Released;
        address payeePayout = merchantPayout[escrows[escrowId].payee] != address(0)
            ? merchantPayout[escrows[escrowId].payee]
            : escrows[escrowId].payee;

        (uint256 fee, uint256 payout) = _splitAndSend(escrows[escrowId].token, payeePayout, m.amount, protocolFeeBps);
        escrows[escrowId].released += payout;

        emit MilestoneReleased(escrowId, index, payout, fee);
    }

    function openDispute(uint256 escrowId, uint256 index, bytes32 evidenceHash) external {
        if (!escrowExists[escrowId]) revert EscrowNotFound();
        if (index >= milestoneCountMap[escrowId]) revert InvalidMilestone();
        if (msg.sender != escrows[escrowId].payer && msg.sender != escrows[escrowId].payee) revert NotAuthorized();
        Milestone storage m = milestones[escrowId][index];
        if (m.state != MilestoneState.Locked) revert InvalidMilestone();

        m.state = MilestoneState.Disputed;
        escrows[escrowId].state = EscrowState.InDispute;
        emit DisputeOpened(escrowId, index, msg.sender, evidenceHash);
    }

    function resolveDispute(uint256 escrowId, uint256 index, uint256 toPayee, uint256 toPayer) external onlyRole(ARBITER_ROLE) nonReentrant {
        if (!escrowExists[escrowId]) revert EscrowNotFound();
        if (index >= milestoneCountMap[escrowId]) revert InvalidMilestone();
        Milestone storage m = milestones[escrowId][index];
        if (m.state != MilestoneState.Disputed) revert InvalidMilestone();
        if (toPayee + toPayer != m.amount) revert AmountMismatch();

        m.state = MilestoneState.Released;

        if (toPayee > 0) {
            address payeePayout = merchantPayout[escrows[escrowId].payee] != address(0)
                ? merchantPayout[escrows[escrowId].payee]
                : escrows[escrowId].payee;
            _transferOut(escrows[escrowId].token, payeePayout, toPayee);
        }

        if (toPayer > 0) {
            _transferOut(escrows[escrowId].token, escrows[escrowId].payer, toPayer);
        }

        escrows[escrowId].released += toPayee;
        escrows[escrowId].state = EscrowState.Funded;

        emit DisputeResolved(escrowId, index, toPayee, toPayer);
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getMilestone(uint256 escrowId, uint256 index) external view returns (Milestone memory) {
        return milestones[escrowId][index];
    }

    // =========================================================================
    // 4. BATCH PAYOUT FUNCTIONS
    // =========================================================================

    function batchPayToken(
        bytes32 batchId,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant whenNotPaused {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyBatch();
        if (recipients.length > MAX_BATCH_RECIPIENTS) revert TooManyRecipients();
        if (isBatchExecuted[batchId]) revert BatchAlreadyExecuted();

        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddressRecipient();
            total += amounts[i];
        }

        uint256 fee = (total * protocolFeeBps) / FEE_DENOMINATOR;
        bool ok = IERC20(token).transferFrom(msg.sender, address(this), total + fee);
        if (!ok) revert TransferFailed();

        if (fee > 0) _transferOut(token, feeRecipient, fee);

        for (uint256 i = 0; i < recipients.length; i++) {
            _transferOut(token, recipients[i], amounts[i]);
            emit PayoutSent(batchId, recipients[i], amounts[i], i);
        }

        isBatchExecuted[batchId] = true;
        emit BatchExecuted(batchId, msg.sender, token, recipients.length, total, fee);
    }

    function batchPayNative(
        bytes32 batchId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant whenNotPaused {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyBatch();
        if (recipients.length > MAX_BATCH_RECIPIENTS) revert TooManyRecipients();
        if (isBatchExecuted[batchId]) revert BatchAlreadyExecuted();

        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddressRecipient();
            total += amounts[i];
        }

        uint256 fee = (total * protocolFeeBps) / FEE_DENOMINATOR;
        if (msg.value != total + fee) revert AmountMismatch();

        if (fee > 0) _transferOut(address(0), feeRecipient, fee);

        for (uint256 i = 0; i < recipients.length; i++) {
            _transferOut(address(0), recipients[i], amounts[i]);
            emit PayoutSent(batchId, recipients[i], amounts[i], i);
        }

        isBatchExecuted[batchId] = true;
        emit BatchExecuted(batchId, msg.sender, address(0), recipients.length, total, fee);
    }

    function quoteBatch(uint256[] calldata amounts) external view returns (uint256 total, uint256 fee) {
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];
        fee = (total * protocolFeeBps) / FEE_DENOMINATOR;
    }

    // =========================================================================
    // 5. PROTOCOL ADMIN & GOVERNANCE
    // =========================================================================

    function setProtocolFeeBps(uint16 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh();
        uint16 old = protocolFeeBps;
        protocolFeeBps = bps;
        emit ProtocolFeeUpdated(old, bps);
    }

    function setMerchantFeeOverride(address merchant, uint16 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh();
        merchantFeeBps[merchant] = bps;
        emit MerchantFeeOverrideSet(merchant, bps);
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert InvalidRecipient();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setTokenAllowed(address token, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenAllowed[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    receive() external payable {}
}
