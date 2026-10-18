// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISubscriptionVault {
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

    error PlanInactive(uint256 planId);
    error NotDue(uint256 subId, uint64 nextChargeAt);
    error NotSubscriber();
    error NotMerchant();
    error CapExceeded(uint256 subId);
    error InvalidStatus(uint256 subId, Status status);
    error InsufficientAllowance(uint256 required, uint256 current);

    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint256 amount, uint32 interval);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint64 firstChargeAt);
    event Charged(uint256 indexed subId, uint256 amount, uint256 fee, uint64 nextChargeAt);
    event ChargeFailed(uint256 indexed subId, uint16 failedAttempts, bytes4 reason);
    event StatusChanged(uint256 indexed subId, Status status);

    function createPlan(
        address token,
        uint256 amount,
        uint32 interval,
        uint32 trialPeriod,
        uint16 maxRetries
    ) external returns (uint256 planId);
    function subscribe(
        uint256 planId,
        uint32 maxCharges,
        uint256 lifetimeCap
    ) external returns (uint256 subId);
    function claim(uint256 subId) external returns (bool success);
    function claimBatch(uint256[] calldata subIds) external returns (bool[] memory results);
    function isDue(uint256 subId) external view returns (bool);
    function getPlan(uint256 planId) external view returns (Plan memory);
    function getSubscription(uint256 subId) external view returns (Subscription memory);
}