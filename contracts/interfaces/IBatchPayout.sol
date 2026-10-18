// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBatchPayout {
    error LengthMismatch();
    error EmptyBatch();
    error TooManyRecipients(uint256 provided, uint256 max);
    error ZeroAddressRecipient(uint256 index);
    error TotalMismatch(uint256 expected, uint256 provided);
    error BatchAlreadyExecuted(bytes32 batchId);
    error NativeTransferFailed(uint256 index);

    event BatchExecuted(
        bytes32 indexed batchId,
        address indexed sender,
        address token,
        uint256 recipientCount,
        uint256 totalAmount,
        uint256 fee
    );
    event PayoutSent(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index);

    function MAX_RECIPIENTS() external view returns (uint256);
    function feeBps() external view returns (uint16);
    function isExecuted(bytes32 batchId) external view returns (bool);
    function quoteTotal(uint256[] calldata amounts)
        external
        view
        returns (uint256 sum, uint256 fee);

    function batchPayToken(
        bytes32 batchId,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external;
    function batchPayNative(
        bytes32 batchId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable;
}