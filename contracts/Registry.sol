// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PaymentRouter.sol";
import "./SubscriptionVault.sol";
import "./EscrowInvoice.sol";
import "./BatchPayout.sol";

/**
 * @title Registry
 * @notice Immutable core contracts with a light registry so merchants and
 *         clients can resolve current versions. Payment contracts are hard to
 *         rug: migrations ship new addresses rather than upgrading in place.
 */
contract Registry {
    mapping(string name => address contractAddr) public contracts;
    mapping(address => string) public contractNames;

    event ContractRegistered(string name, address contractAddr);

    function register(string calldata name, address contractAddr) external {
        require(contracts[name] == address(0), "AlreadyRegistered");
        contracts[name] = contractAddr;
        contractNames[contractAddr] = name;
        emit ContractRegistered(name, contractAddr);
    }

    function resolve(string calldata name) external view returns (address) {
        return contracts[name];
    }
}
