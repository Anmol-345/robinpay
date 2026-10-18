// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./security.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title EscrowInvoice
 * @notice Milestone-based escrow. Payer funds once; funds unlock per milestone on
 *         client release; disputes can be settled by an ARBITER; auto-release
 *         deadline protects the payee.
 */
contract EscrowInvoice is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

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
    address public feeRecipient;
    uint16 public protocolFeeBps;

    event EscrowCreated(uint256 indexed escrowId, bytes32 indexed invoiceId, address indexed payee, address token, uint256 total);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer, uint256 amount);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed index, uint256 payout, uint256 fee);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed index, address indexed openedBy, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed index, uint256 toPayee, uint256 toPayer);
    event EscrowCancelled(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ARBITER_ROLE, msg.sender);
        nextEscrowId = 1;
    }

    function createEscrow(
        bytes32 invoiceId,
        address payee,
        address token,
        uint256[] calldata milestoneAmounts,
        uint64[] calldata releaseDeadlines
    ) external returns (uint256 escrowId) {
        require(payee != address(0), "InvalidPayee");
        require(milestoneAmounts.length == releaseDeadlines.length, "LengthMismatch");
        require(milestoneAmounts.length > 0, "EmptyBatch");

        uint256 total = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            require(milestoneAmounts[i] > 0, "InvalidAmount");
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

        Milestone[] memory ms = new Milestone[](milestoneAmounts.length);
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            ms[i] = Milestone({
                amount: milestoneAmounts[i],
                releaseDeadline: releaseDeadlines[i],
                state: MilestoneState.Locked
            });
        }
        milestones[escrowId] = ms;
        milestoneCountMap[escrowId] = milestoneAmounts.length;
        escrowExists[escrowId] = true;

        emit EscrowCreated(escrowId, invoiceId, payee, token, total);
    }

    function fund(uint256 escrowId) external payable {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(escrows[escrowId].state == EscrowState.Created, "InvalidState");
        require(msg.sender == escrows[escrowId].payer, "NotPayer");

        uint256 total = escrows[escrowId].total;
        if (escrows[escrowId].token == address(0)) {
            require(msg.value == total, "AmountMismatch");
        } else {
            // ERC-20 pull; payer must pre-approve this contract
            IERC20(escrows[escrowId].token).transferFrom(msg.sender, address(this), total);
        }

        escrows[escrowId].state = EscrowState.Funded;
        emit EscrowFunded(escrowId, msg.sender, total);
    }

    function releaseMilestone(uint256 escrowId, uint256 index) external {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(escrows[escrowId].state == EscrowState.Funded, "InvalidState");
        require(msg.sender == escrows[escrowId].payer, "NotPayer");
        require(index < milestoneCountMap[escrowId], "InvalidMilestone");

        Milestone storage m = milestones[escrowId][index];
        require(m.state == MilestoneState.Locked, "InvalidMilestone");

        uint256 fee = (m.amount * protocolFeeBps) / 10000;
        uint256 payout = m.amount - fee;

        m.state = MilestoneState.Released;
        escrows[escrowId].released += payout;

        if (escrows[escrowId].token == address(0)) {
            (bool sent,) = payable(escrows[escrowId].payee).call{value: payout}("");
            require(sent, "NativeTransferFailed");
            if (fee > 0) {
                (bool sent2,) = payable(feeRecipient).call{value: fee}("");
                require(sent2, "NativeTransferFailed");
            }
        } else {
            IERC20(escrows[escrowId].token).transfer(escrows[escrowId].payee, payout);
            if (fee > 0) IERC20(escrows[escrowId].token).transfer(feeRecipient, fee);
        }

        // Check completion
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

    function autoRelease(uint256 escrowId, uint256 index) external {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(msg.sender == escrows[escrowId].payee, "NotPayee");
        require(index < milestoneCountMap[escrowId], "InvalidMilestone");

        Milestone storage m = milestones[escrowId][index];
        require(m.state == MilestoneState.Locked, "InvalidMilestone");
        require(block.timestamp >= m.releaseDeadline, "DeadlineNotReached");

        // No open dispute for this milestone -> release to payee
        uint256 fee = (m.amount * protocolFeeBps) / 10000;
        uint256 payout = m.amount - fee;

        m.state = MilestoneState.Released;
        escrows[escrowId].released += payout;

        if (escrows[escrowId].token == address(0)) {
            (bool sent,) = payable(escrows[escrowId].payee).call{value: payout}("");
            require(sent, "NativeTransferFailed");
            if (fee > 0) {
                (bool sent2,) = payable(feeRecipient).call{value: fee}("");
                require(sent2, "NativeTransferFailed");
            }
        } else {
            IERC20(escrows[escrowId].token).transfer(escrows[escrowId].payee, payout);
            if (fee > 0) IERC20(escrows[escrowId].token).transfer(feeRecipient, fee);
        }

        emit MilestoneReleased(escrowId, index, payout, fee);
    }

    function openDispute(uint256 escrowId, uint256 index, bytes32 evidenceHash) external {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(index < milestoneCountMap[escrowId], "InvalidMilestone");
        require(msg.sender == escrows[escrowId].payer || msg.sender == escrows[escrowId].payee, "NotPayerOrPayee");
        Milestone storage m = milestones[escrowId][index];
        require(m.state == MilestoneState.Locked, "InvalidMilestone");
        m.state = MilestoneState.Disputed;
        escrows[escrowId].state = EscrowState.InDispute;
        emit DisputeOpened(escrowId, index, msg.sender, evidenceHash);
    }

    function resolveDispute(uint256 escrowId, uint256 index, uint256 toPayee, uint256 toPayer) external onlyRole(ARBITER_ROLE) {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(index < milestoneCountMap[escrowId], "InvalidMilestone");
        Milestone storage m = milestones[escrowId][index];
        require(m.state == MilestoneState.Disputed, "InvalidMilestone");
        require(toPayee + toPayer == m.amount, "AmountMismatch");

        m.state = MilestoneState.Released;
        if (toPayee > 0) {
            if (escrows[escrowId].token == address(0)) {
                (bool sent,) = payable(escrows[escrowId].payee).call{value: toPayee}("");
                require(sent, "NativeTransferFailed");
            } else {
                IERC20(escrows[escrowId].token).transfer(escrows[escrowId].payee, toPayee);
            }
        }
        if (toPayer > 0) {
            if (escrows[escrowId].token == address(0)) {
                (bool sent,) = payable(escrows[escrowId].payer).call{value: toPayer}("");
                require(sent, "NativeTransferFailed");
            } else {
                IERC20(escrows[escrowId].token).transfer(escrows[escrowId].payer, toPayer);
            }
        }

        escrows[escrowId].released += toPayee;

        bool allDone = true;
        for (uint256 i = 0; i < milestoneCountMap[escrowId]; i++) {
            MilestoneState s = milestones[escrowId][i].state;
            if (s != MilestoneState.Released && s != MilestoneState.Refunded) {
                allDone = false;
                break;
            }
        }
        if (allDone) escrows[escrowId].state = EscrowState.Completed;
        else escrows[escrowId].state = EscrowState.Funded;

        emit DisputeResolved(escrowId, index, toPayee, toPayer);
    }

    function cancelUnfunded(uint256 escrowId) external {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(msg.sender == escrows[escrowId].payer, "NotPayer");
        require(escrows[escrowId].state == EscrowState.Created, "InvalidState");
        escrows[escrowId].state = EscrowState.Cancelled;
        emit EscrowCancelled(escrowId);
    }

    function refundRemaining(uint256 escrowId) external {
        require(escrowExists[escrowId], "EscrowNotFound");
        require(msg.sender == escrows[escrowId].payer || msg.sender == escrows[escrowId].payee || hasRole(ARBITER_ROLE, msg.sender), "NotAuthorized");
        require(escrows[escrowId].state == EscrowState.Cancelled || escrows[escrowId].state == EscrowState.Refunded, "InvalidState");

        uint256 remaining = escrows[escrowId].total - escrows[escrowId].released;
        if (remaining > 0) {
            if (escrows[escrowId].token == address(0)) {
                (bool sent,) = payable(escrows[escrowId].payer).call{value: remaining}("");
                require(sent, "NativeTransferFailed");
            } else {
                IERC20(escrows[escrowId].token).transfer(escrows[escrowId].payer, remaining);
            }
        }
        escrows[escrowId].state = EscrowState.Refunded;
        emit EscrowRefunded(escrowId, remaining);
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getMilestone(uint256 escrowId, uint256 index) external view returns (Milestone memory) {
        return milestones[escrowId][index];
    }
}
