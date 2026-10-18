// =============================================================================
// lib/chain/client.ts — viem clients (public reads + operator signer)
// =============================================================================
// Public client: read-only, server-side, used for receipts/logs/blocks.
// Operator wallet: server-side signer for cron-subscription claims. Holds only
// the on-chain OPERATOR role and a minimal gas balance. KMS/HSM in production.
import { createPublicClient, http, createWalletClient, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from '@/lib/env';
import { robinhoodChain, ROBINHOOD_CHAIN_ID } from '@/lib/chain/chains';

let _publicClient: ReturnType<typeof createPublicClient> | undefined;

export function publicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: robinhoodChain(env().ROBINHOOD_RPC_URL),
      transport: http(env().ROBINHOOD_RPC_URL),
      pollingInterval: 1_000,
    });
  }
  return _publicClient;
}

export function chainId(): number {
  return ROBINHOOD_CHAIN_ID;
}

let _operatorAccount: ReturnType<typeof privateKeyToAccount> | undefined;
let _operatorWallet: ReturnType<typeof createWalletClient> | undefined;

export function operatorAccount() {
  if (!_operatorAccount) {
    _operatorAccount = privateKeyToAccount(env().OPERATOR_PRIVATE_KEY as `0x${string}`);
  }
  return _operatorAccount;
}

export function operatorWallet() {
  if (!_operatorWallet) {
    _operatorWallet = createWalletClient({
      account: operatorAccount(),
      chain: robinhoodChain(env().ROBINHOOD_RPC_URL),
      transport: http(env().ROBINHOOD_RPC_URL),
    });
  }
  return _operatorWallet;
}

export const ROUTER_ABI = parseAbi([
  'event PaymentProcessed(bytes32 indexed orderId, address indexed merchant, address indexed payer, address token, uint256 gross, uint256 fee, uint256 net, bytes32 metadataHash)',
  'function isOrderPaid(bytes32 orderId) view returns (bool)',
  'function quote(address merchant, uint256 amount) view returns (uint256 fee, uint256 net)',
]);

export const SUBSCRIPTION_VAULT_ABI = parseAbi([
  'event Charged(uint256 indexed subId, uint256 amount, uint256 fee, uint256 nextChargeAt)',
  'event ChargeFailed(uint256 indexed subId, uint256 failedAttempts, bytes reason)',
  'function claim(uint256 subId) external returns (bool success)',
  'function claimBatch(uint256[] calldata subIds) external returns (bool[] memory results)',
  'function isDue(uint256 subId) external view returns (bool)',
  'function getDueSubscriptions(uint256 offset, uint256 limit) external view returns (uint256[] memory ids)',
]);

export const BATCH_PAYOUT_ABI = parseAbi([
  'event BatchExecuted(bytes32 indexed batchId, address indexed sender, address token, uint256 recipientCount, uint256 totalAmount, uint256 fee)',
  'event PayoutSent(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index)',
  'function MAX_RECIPIENTS() external view returns (uint256)',
  'function isExecuted(bytes32 batchId) external view returns (bool)',
]);
