// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Security
 * @notice Minimal AccessControl, Pausable, and ReentrancyGuard primitives so the
 *         RobinPay contracts are standalone and do not depend on an external
 *         OpenZeppelin version. In production, audit these or swap in OZ v5.
 */
abstract contract AccessControl {
    bytes32 public constant DEFAULT_ADMIN_ROLE = bytes32(uint256(0));

    mapping(bytes32 role => mapping(address account => bool)) private _roles;
    mapping(bytes32 role => mapping(address account => uint256)) private _roleExpiry;

    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    function _setupRole(bytes32 role, address account) internal virtual {
        _roles[role][account] = true;
        emit RoleGranted(role, account, address(0));
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        emit RoleAdminChanged(role, _getRoleAdmin(role), adminRole);
    }

    function _grantRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _setupRole(role, account);
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function _revokeRole(bytes32 role, address account) internal virtual {
        if (hasRole(role, account)) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, _msgSender());
        }
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role][account];
    }

    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function onlyRole(bytes32 role) modifier {
        if (!hasRole(role, msg.sender)) revert AccessControlUnauthorized(msg.sender, role);
        _;
    }
}

error AccessControlUnauthorized(address account, bytes32 neededRole);

abstract contract Pausable {
    bool private _paused;

    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _paused = false;
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

error PausablePaused();
error PausableNotPaused();

abstract contract ReentrancyGuard {
    bool private _entered;

    constructor() {
        _entered = false;
    }

    modifier nonReentrant() {
        if (_entered) revert ReentrancyGuardReentrant();
        _entered = true;
        _;
        _entered = false;
    }
}

error ReentrancyGuardReentrant();
