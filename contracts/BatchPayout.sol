// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./security.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title BatchPayout
 * @notice One transaction pays many wallets. Inputs are bounded by MAX_RECIPIENTS
 *         to stay within the L2 gas limit. Each batch has a unique batchId to
 *         prevent replay; chunks use batchId = keccak256(payrollId, chunkIndex).
 */
contract BatchPayout is AccessControl, ReentrancyGuard {
    uint256 public constant MAX_RECIPIENTS = 200;
    uint16 public constant FEE_DENOMINATOR = 10000;

    uint16 public feeBps;
    address public feeRecipient;

    mapping(bytes32 => bool) public isExecuted;

    event BatchExecuted(
        bytes32 indexed batchId,
        address indexed sender,
        address token,
        uint256 recipientCount,
        uint256 totalAmount,
        uint256 fee
    );
    event PayoutSent(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index);

    constructor() {
        feeBps = 0;
        feeRecipient = msg.sender;
    }

    function batchPayToken(
        bytes32 batchId,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(recipients.length == amounts.length, "LengthMismatch");
        require(recipients.length > 0, "EmptyBatch");
        require(recipients.length <= MAX_RECIPIENTS, "TooManyRecipients");
        require(!isExecuted[batchId], "BatchAlreadyExecuted");

        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "ZeroAddressRecipient");
            total += amounts[i];
        }

        uint256 fee = (total * feeBps) / FEE_DENOMINATOR;
        uint256 net = total - fee;

        // Pull the gross sum from sender
        IERC20(token).transferFrom(msg.sender, address(this), total);

        // Pay fee
        if (fee > 0) IERC20(token).transfer(feeRecipient, fee);

        // Pay recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20(token).transfer(recipients[i], amounts[i]);
            emit PayoutSent(batchId, recipients[i], amounts[i], i);
        }

        isExecuted[batchId] = true;
        emit BatchExecuted(batchId, msg.sender, token, recipients.length, total, fee);
    }

    function batchPayNative(
        bytes32 batchId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "LengthMismatch");
        require(recipients.length > 0, "EmptyBatch");
        require(recipients.length <= MAX_RECIPIENTS, "TooManyRecipients");
        require(!isExecuted[batchId], "BatchAlreadyExecuted");

        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "ZeroAddressRecipient");
            total += amounts[i];
        }

        uint256 fee = (total * feeBps) / FEE_DENOMINATOR;
        require(msg.value == total + fee, "NativeTransferFailed");

        if (fee > 0) {
            (bool sent,) = payable(feeRecipient).call{value: fee}("");
            require(sent, "NativeTransferFailed");
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool sent,) = payable(recipients[i]).call{value: amounts[i]}("");
            require(sent, "NativeTransferFailed");
            emit PayoutSent(batchId, recipients[i], amounts[i], i);
        }

        isExecuted[batchId] = true;
        emit BatchExecuted(batchId, msg.sender, address(0), recipients.length, total, fee);
    }

    function quoteTotal(uint256[] calldata amounts) external view returns (uint256 sum, uint256 fee) {
        for (uint256 i = 0; i < amounts.length; i++) sum += amounts[i];
        fee = (sum * feeBps) / FEE_DENOMINATOR;
    }

    function MAX_RECIPIENTS() external view returns (uint256) {
        return 200;
    }
}
