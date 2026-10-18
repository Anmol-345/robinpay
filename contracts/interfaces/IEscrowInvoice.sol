// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEscrowInvoice {
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

    error NotPayer();
    error NotPayee();
    error NotArbiter();
    error InvalidState(EscrowState state);
    error InvalidMilestone(uint256 index);
    error DeadlineNotReached(uint64 deadline);
    error AmountMismatch(uint256 expected, uint256 provided);

    event EscrowCreated(uint256 indexed escrowId, bytes32 indexed invoiceId, address indexed payee, address token, uint256 total);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer, uint256 amount);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed index, uint256 payout, uint256 fee);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed index, address indexed openedBy, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed index, uint256 toPayee, uint256 toPayer);
    event EscrowCancelled(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);

    function createEscrow(
        bytes32 invoiceId,
        address payee,
        address token,
        uint256[] calldata milestoneAmounts,
        uint64[] calldata releaseDeadlines
    ) external returns (uint256 escrowId);
    function fund(uint256 escrowId) external payable;
    function releaseMilestone(uint256 escrowId, uint256 index) external;
    function autoRelease(uint256 escrowId, uint256 index) external;
    function openDispute(uint256 escrowId, uint256 index, bytes32 evidenceHash) external;
    function resolveDispute(uint256 escrowId, uint256 index, uint256 toPayee, uint256 toPayer) external;
    function cancelUnfunded(uint256 escrowId) external;
    function refundRemaining(uint256 escrowId) external;

    function getEscrow(uint256 escrowId) external view returns (Escrow memory);
    function getMilestone(uint256 escrowId, uint256 index) external view returns (Milestone memory);
    function milestoneCount(uint256 escrowId) external view returns (uint256);
}