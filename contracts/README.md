# RobinPay Unified Smart Contract

`RobinPay.sol` is the **all-in-one smart contract** for the RobinPay protocol on Robinhood Chain.

Instead of deploying 5 different contracts and managing 5 addresses, you deploy **just this one contract**:
- **Checkout & Router**: Native ETH and ERC-20 payment routing, order deduplication (`isOrderPaid`), protocol & merchant fee splits.
- **Subscriptions**: EIP-712 pre-approved recurring subscription billing (`createPlan`, `subscribe`, `claim`).
- **Milestone Escrow**: Phased client deliverables and dispute resolution (`createEscrow`, `releaseMilestone`, `openDispute`).
- **Batch Payouts**: Gas-optimized multi-recipient payroll disbursements in a single transaction (`batchPayToken`, `batchPayNative`).

---

## 1-Minute Deployment via Remix IDE (Fastest)

1. Open [Remix IDE](https://remix.ethereum.org).
2. Create a new file `RobinPay.sol` and paste the contents of `contracts/RobinPay.sol`.
3. In your browser wallet (MetaMask / Rabby), switch to **Robinhood Chain Testnet**:
   - **RPC URL**: `https://rpc.testnet.chain.robinhood.com`
   - **Chain ID**: `46630` (Hex: `0xb626`)
   - **Currency**: `ETH`
4. Under Remix **Solidity Compiler**:
   - Select compiler version `0.8.24` (or any `0.8.x`).
   - Click to expand **Advanced Configurations** (or locate **Enable optimization**).
   - **Check the box "Enable optimization"** and leave runs at `200` (or `50`).
   > *Note: If optimization is left unchecked (Remix's default), Solidity includes unoptimized debug dispatch tables which trigger a 24KB Spurious Dragon warning. Enabling optimization shrinks RobinPay to **~20.7 KB**, well below Ethereum's 24.576 KB EIP-170 limit!*
5. Click **Compile RobinPay.sol** (all warnings disappear).
6. Under **Deploy & Run Transactions**, select **Injected Provider - MetaMask**.
7. Select contract **RobinPay** and click **Deploy**.
7. Confirm the transaction in your wallet.
8. Copy the deployed contract address and set it in your `.env.local`:
   ```env
   PAYMENT_ROUTER_ADDRESS=0xYourDeployedContractAddress
   NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS=0xYourDeployedContractAddress
   SUBSCRIPTION_VAULT_ADDRESS=0xYourDeployedContractAddress
   ESCROW_INVOICE_ADDRESS=0xYourDeployedContractAddress
   BATCH_PAYOUT_ADDRESS=0xYourDeployedContractAddress
   ```

---

## Deployment via Foundry

```bash
forge create contracts/RobinPay.sol:RobinPay \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --private-key <YOUR_PRIVATE_KEY>
```

---

## Network Details

- **Network Name**: Robinhood Chain Testnet
- **Chain ID**: 46630 (`0xb626`)
- **RPC URL**: `https://rpc.testnet.chain.robinhood.com`
- **Block Explorer**: `https://explorer.testnet.chain.robinhood.com`
- **Native Token**: ETH
- **Testnet USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
