// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./security.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/**
 * @title PaymentRouter
 * @notice Standard checkout. Pulls funds from payer, splits protocol fee and
 *         merchant net atomically, records orderId to prevent replay.
 */
contract PaymentRouter is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(bytes32 orderId => bool) public isOrderPaid;
    mapping(address merchant => address payout) public merchantPayout;
    mapping(address merchant => bool) public merchantActive;
    mapping(address merchant => uint16) public merchantFeeBps;
    mapping(address token => bool) public tokenAllowed;

    address public feeRecipient;
    uint16 public protocolFeeBps;

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

    uint16 public constant MAX_FEE_BPS = 500; // 5%

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        tokenAllowed[address(0)] = true; // native ETH always allowed
        feeRecipient = msg.sender;
    }

    function pay(
        bytes32 orderId,
        address merchant,
        address token,
        uint256 amount,
        bytes32 metadataHash
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "InvalidAmount");
        require(tokenAllowed[token], "TokenNotAllowed");
        require(merchantActive[merchant], "MerchantNotActive");
        require(!isOrderPaid[orderId], "OrderAlreadyPaid");

        uint16 feeBps = merchantFeeBps[merchant] > 0 ? merchantFeeBps[merchant] : protocolFeeBps;
        require(feeBps <= MAX_FEE_BPS, "FeeTooHigh");

        uint256 fee = (amount * feeBps) / 10000;
        uint256 net = amount - fee;

        // Pull ERC-20 from payer (payer must have pre-approved this contract)
        if (token != address(0)) {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            IERC20(token).transfer(merchantPayout[merchant], net);
            if (fee > 0) IERC20(token).transfer(feeRecipient, fee);
        } else {
            require(msg.value == amount, "NativeTransferFailed");
            (bool sent,) = merchantPayout[merchant].call{value: net}("");
            require(sent, "NativeTransferFailed");
            if (fee > 0) {
                (bool sent2,) = feeRecipient.call{value: fee}("");
                require(sent2, "NativeTransferFailed");
            }
        }

        isOrderPaid[orderId] = true;
        emit PaymentProcessed(orderId, merchant, msg.sender, token, amount, fee, net, metadataHash);
    }

    function payNative(
        bytes32 orderId,
        address merchant,
        bytes32 metadataHash
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "InvalidAmount");
        require(merchantActive[merchant], "MerchantNotActive");
        require(!isOrderPaid[orderId], "OrderAlreadyPaid");

        uint16 feeBps = merchantFeeBps[merchant] > 0 ? merchantFeeBps[merchant] : protocolFeeBps;
        require(feeBps <= MAX_FEE_BPS, "FeeTooHigh");

        uint256 amount = msg.value;
        uint256 fee = (amount * feeBps) / 10000;
        uint256 net = amount - fee;

        (bool sent,) = merchantPayout[merchant].call{value: net}("");
        require(sent, "NativeTransferFailed");
        if (fee > 0) {
            (bool sent2,) = feeRecipient.call{value: fee}("");
            require(sent2, "NativeTransferFailed");
        }

        isOrderPaid[orderId] = true;
        emit PaymentProcessed(orderId, merchant, msg.sender, address(0), amount, fee, net, metadataHash);
    }

    function registerMerchant(address payout) external nonReentrant {
        require(payout != address(0), "InvalidPayout");
        merchantPayout[msg.sender] = payout;
        merchantActive[msg.sender] = true;
        emit MerchantRegistered(msg.sender, payout);
    }

    function updatePayout(address payout) external {
        require(msg.sender == merchantPayout[msg.sender] ? true : merchantActive[msg.sender], "MerchantNotActive");
        require(payout != address(0), "InvalidPayout");
        address old = merchantPayout[msg.sender];
        merchantPayout[msg.sender] = payout;
        emit PayoutUpdated(msg.sender, payout);
    }

    function setProtocolFeeBps(uint16 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= MAX_FEE_BPS, "FeeTooHigh");
        uint16 old = protocolFeeBps;
        protocolFeeBps = bps;
        emit ProtocolFeeUpdated(old, bps);
    }

    function setMerchantFeeOverride(address merchant, uint16 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= MAX_FEE_BPS, "FeeTooHigh");
        merchantFeeBps[merchant] = bps;
        emit MerchantFeeOverrideSet(merchant, bps);
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "InvalidRecipient");
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

    function quote(address merchant, uint256 amount) external view returns (uint256 fee, uint256 net) {
        uint16 feeBps = merchantFeeBps[merchant] > 0 ? merchantFeeBps[merchant] : protocolFeeBps;
        fee = (amount * feeBps) / 10000;
        net = amount - fee;
    }

    function payoutOf(address merchant) external view returns (address) {
        return merchantPayout[merchant];
    }
}
