// =============================================================================
// lib/payments/verify.ts — Shared payment verification logic
// =============================================================================
// Trust the chain, not the client. Re-derives everything from the receipt and
// ignores client-reported amounts.
import { decodeEventLog, type Hex } from 'viem';
import { publicClient, ROUTER_ABI } from '@/lib/chain/client';
import { env } from '@/lib/env';

export interface VerifiedPayment {
  orderId: `0x${string}`;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  token: `0x${string}`;
  gross: bigint;
  fee: bigint;
  net: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
}

export async function verifyPayment({
  txHash,
  orderId,
  merchantWallet,
  tokenAddress,
  minAmount,
}: {
  txHash: Hex;
  orderId: `0x${string}`;
  merchantWallet: string;
  tokenAddress: string;
  minAmount: bigint;
}): Promise<VerifiedPayment> {
  const client = publicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    throw new Error('INVALID_TX: transaction reverted');
  }

  const head = await client.getBlockNumber();
  const required = BigInt(env().REQUIRED_CONFIRMATIONS);
  if (head - receipt.blockNumber < required) {
    throw new Error('PENDING: insufficient confirmations');
  }

  let match: VerifiedPayment | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env().PAYMENT_ROUTER_ADDRESS.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({
        abi: ROUTER_ABI,
        data: log.data,
        topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
      });
      if (ev.eventName !== 'PaymentProcessed') continue;
      const args = ev.args as unknown as { orderId: `0x${string}` };
      if (args.orderId.toLowerCase() !== orderId.toLowerCase()) continue;
      match = {
        orderId: args.orderId,
        merchant: (ev.args as unknown as { merchant: `0x${string}` }).merchant,
        payer: (ev.args as unknown as { payer: `0x${string}` }).payer,
        token: (ev.args as unknown as { token: `0x${string}` }).token,
        gross: (ev.args as unknown as { gross: bigint }).gross,
        fee: (ev.args as unknown as { fee: bigint }).fee,
        net: (ev.args as unknown as { net: bigint }).net,
        txHash,
        logIndex: log.logIndex,
        blockNumber: receipt.blockNumber,
      };
      break;
    } catch {
      /* not our event */
    }
  }

  if (!match) throw new Error('INVALID_TX: no matching PaymentProcessed event');

  if (match.merchant.toLowerCase() !== merchantWallet.toLowerCase()) {
    throw new Error('WRONG_MERCHANT: merchant mismatch');
  }
  if (match.token.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error('INVALID_TX: token mismatch');
  }
  if (match.gross < minAmount) {
    throw new Error('AMOUNT_MISMATCH: underpaid');
  }

  return match;
}
