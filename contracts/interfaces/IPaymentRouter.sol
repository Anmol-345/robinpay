// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "openzeppelin-solidity/contracts/access/AccessControl.sol";
import {Pausable} from "openzeppelin-solidity/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "openzeppelin-solidity/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

// Roles
bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00...00; // placeholder
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

// Note: This is an interface skeleton matching IPaymentRouter.sol. Full
// implementation requires OpenZeppelin v5 contracts installed via forge/npm.
interface IPaymentRouter {
    error InvalidAmount();
    error TokenNotAllowed(address token);
    error MerchantNotActive(address merchant);
    error OrderAlreadyPaid(bytes32 orderId);
    error FeeTooHigh(uint16 bps);

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
    event ProtocolFeeUpdated(uint16 oldBps, uint16 newBps);

    function pay(
        bytes32 orderId,
        address merchant,
        address token,
        uint256 amount,
        bytes32 metadataHash
    ) external;

    function payNative(
        bytes32 orderId,
        address merchant,
        bytes32 metadataHash
    ) external payable;

    function registerMerchant(address payout) external;
    function setProtocolFeeBps(uint16 bps) external;
    function setTokenAllowed(address token, bool allowed) external;
    function pause() external;
    function unpause() external;

    function isOrderPaid(bytes32 orderId) external view returns (bool);
    function quote(address merchant, uint256 amount)
        external
        view
        returns (uint256 fee, uint256 net);
}