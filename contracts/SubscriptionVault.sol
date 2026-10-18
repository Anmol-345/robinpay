// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./security.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title SubscriptionVault
 * @notice Pull-payment model. Subscriber approves an allowance to the vault and
 *         subscribes to a merchant plan. The OPERATOR (cron signer) may call
 *         claim, but the vault enforces on-chain that each claim equals the plan
 *         price, is not early, and stays within the subscriber's cap.
 */
contract SubscriptionVault is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status { Active, Paused, Cancelled, PastDue }

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
        Status status;
    }

    mapping(uint256 => Plan) public plans;
    mapping(uint256 => Subscription) public subscriptions;
    mapping(uint256 => bool) public planExists;
    mapping(address => uint256) public subscriberCount;

    uint256 public nextPlanId;
    uint256 public nextSubId;
    uint16 public protocolFeeBps;
    address public feeRecipient;

    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint256 amount, uint32 interval);
    event PlanDeactivated(uint256 indexed planId);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint64 firstChargeAt);
    event Charged(uint256 indexed subId, uint256 amount, uint256 fee, uint64 nextChargeAt);
    event ChargeFailed(uint256 indexed subId, uint16 failedAttempts, bytes4 reason);
    event StatusChanged(uint256 indexed subId, Status status);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        nextPlanId = 1;
        nextSubId = 1;
    }

    function createPlan(
        address token,
        uint256 amount,
        uint32 interval,
        uint32 trialPeriod,
        uint16 maxRetries
    ) external returns (uint256 planId) {
        require(amount > 0, "InvalidAmount");
        require(interval > 0, "InvalidInterval");
        require(msg.sender != address(0), "InvalidMerchant");

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
        subscriberCount[msg.sender] = subscriberCount[msg.sender] + 1;

        emit PlanCreated(planId, msg.sender, token, amount, interval);
    }

    function deactivatePlan(uint256 planId) external {
        require(planExists[planId], "PlanNotFound");
        require(plans[planId].merchant == msg.sender, "NotMerchant");
        plans[planId].active = false;
        emit PlanDeactivated(planId);
    }

    function subscribe(
        uint256 planId,
        uint32 maxCharges,
        uint256 lifetimeCap
    ) external returns (uint256 subId) {
        require(planExists[planId], "PlanNotFound");
        Plan storage plan = plans[planId];
        require(plan.active, "PlanInactive");

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
            status: plan.trialPeriod > 0 ? Status.Active : Status.Active
        });

        emit Subscribed(subId, planId, msg.sender, firstChargeAt);
    }

    function pause(uint256 subId) external {
        require(subscriptions[subId].subscriber == msg.sender, "NotSubscriber");
        require(subscriptions[subId].status == Status.Active, "InvalidStatus");
        subscriptions[subId].status = Status.Paused;
        emit StatusChanged(subId, Status.Paused);
    }

    function resume(uint256 subId) external {
        require(subscriptions[subId].subscriber == msg.sender, "NotSubscriber");
        require(subscriptions[subId].status == Status.Paused, "InvalidStatus");
        subscriptions[subId].status = Status.Active;
        emit StatusChanged(subId, Status.Active);
    }

    function cancel(uint256 subId) external {
        require(subscriptions[subId].subscriber == msg.sender, "NotSubscriber");
        subscriptions[subId].status = Status.Cancelled;
        emit StatusChanged(subId, Status.Cancelled);
    }

    function claim(uint256 subId) external onlyRole(OPERATOR_ROLE) returns (bool success) {
        Subscription storage sub = subscriptions[subId];
        require(sub.status != Status.Cancelled, "InvalidStatus");
        Plan storage plan = plans[sub.planId];

        // Not due yet
        if (block.timestamp < sub.nextChargeAt) {
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("NotDue()")));
            return false;
        }

        // Max charges cap
        if (sub.maxCharges > 0 && sub.chargesMade >= sub.maxCharges) {
            sub.status = Status.Cancelled;
            emit StatusChanged(subId, Status.Cancelled);
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("MaxCharges()")));
            return false;
        }

        // Lifetime cap
        uint256 nextTotal = sub.totalCharged + plan.amount;
        if (sub.lifetimeCap > 0 && nextTotal > sub.lifetimeCap) {
            sub.status = Status.PastDue;
            emit StatusChanged(subId, Status.PastDue);
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("CapExceeded()")));
            return false;
        }

        // Allowance check
        uint256 allowance = IERC20(plan.token).allowance(sub.subscriber, address(this));
        if (allowance < plan.amount) {
            sub.failedAttempts++;
            if (sub.failedAttempts >= plan.maxRetries) {
                sub.status = Status.PastDue;
                emit StatusChanged(subId, Status.PastDue);
            }
            emit ChargeFailed(subId, sub.failedAttempts, bytes4(keccak256("InsufficientAllowance()")));
            return false;
        }

        // Transfer plan.amount from subscriber to merchant (minus protocol fee)
        uint256 fee = (plan.amount * protocolFeeBps) / 10000;
        uint256 net = plan.amount - fee;

        IERC20(plan.token).transferFrom(sub.subscriber, address(this), plan.amount);
        IERC20(plan.token).transfer(plan.merchant, net);
        if (fee > 0) IERC20(plan.token).transfer(feeRecipient, fee);

        sub.chargesMade++;
        sub.totalCharged = nextTotal;
        sub.failedAttempts = 0;
        sub.nextChargeAt = uint64(sub.nextChargeAt + plan.interval);
        sub.status = Status.Active;

        emit Charged(subId, plan.amount, fee, sub.nextChargeAt);
        return true;
    }

    function claimBatch(uint256[] calldata subIds) external onlyRole(OPERATOR_ROLE) returns (bool[] memory results) {
        results = new bool[](subIds.length);
        for (uint256 i = 0; i < subIds.length; i++) {
            try claim(subIds[i]) returns (bool ok) {
                results[i] = ok;
            } catch Error(string memory reason) {
                results[i] = false;
            } catch (bytes memory reason) {
                results[i] = false;
            }
        }
        return results;
    }

    function isDue(uint256 subId) external view returns (bool) {
        Subscription storage sub = subscriptions[subId];
        return block.timestamp >= sub.nextChargeAt && sub.status == Status.Active;
    }

    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    function getSubscription(uint256 subId) external view returns (Subscription memory) {
        return subscriptions[subId];
    }
}
