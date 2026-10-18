// =============================================================================
// lib/payments/status.ts — Chain-derived payment status (no database)
// =============================================================================
// Payment status is derived entirely from the blockchain. There is no server-
// side record of "paid"; we call isOrderPaid(orderId) and, if needed, scan the
// PaymentProcessed logs for the indexed orderId to recover the payer/amounts.
import { decodeEventLog, type Hex } from 'viem';
import { publicClient, ROUTER_ABI } from '@/lib/chain/client';
import { env } from '@/lib/env';

interface PaymentProcessedArgs {
  orderId: `0x${string}`;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  token: `0x${string}`;
  gross: bigint;
  fee: bigint;
  net: bigint;
  metadataHash: `0x${string}`;
}

export interface PaymentStatus {
  paid: boolean;
  orderId: `0x${string}`;
  txHash?: `0x${string}`;
  payer?: `0x${string}`;
  gross?: bigint;
  fee?: bigint;
  net?: bigint;
  blockNumber?: bigint;
}

// Confirm that an order has been paid on-chain.
export async function isOrderPaid(orderId: `0x${string}`): Promise<boolean> {
  try {
    return await publicClient().readContract({
      address: env().PAYMENT_ROUTER_ADDRESS as `0x${string}`,
      abi: ROUTER_ABI,
      functionName: 'isOrderPaid',
      args: [orderId],
    });
  } catch {
    return false;
  }
}

// Recover the full PaymentProcessed event for an orderId by scanning logs.
// Scans the most recent block range to keep it cheap; widen as needed.
export async function getPaymentEvent({
  orderId,
  fromBlock,
  toBlock,
}: {
  orderId: `0x${string}`;
  fromBlock?: bigint;
  toBlock?: bigint;
}): Promise<PaymentProcessedArgs | null> {
  const head = await publicClient().getBlockNumber();
  const paymentProcessedAbi = ROUTER_ABI.find(
    (a) => a.type === 'event' && a.name === 'PaymentProcessed',
  );
  if (!paymentProcessedAbi) return null;
  const logs = await publicClient().getLogs({
    address: env().PAYMENT_ROUTER_ADDRESS as `0x${string}`,
    event: paymentProcessedAbi as unknown as Extract<typeof ROUTER_ABI[number], { type: 'event' }>,
    fromBlock: fromBlock ?? head - BigInt(5000),
    toBlock: toBlock ?? head,
  });

  const orderIdLower = orderId.toLowerCase();
  for (const log of logs) {
    try {
      const ev = decodeEventLog({
        abi: ROUTER_ABI,
        data: log.data as Hex,
        topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
      });
      if (ev.eventName !== 'PaymentProcessed') continue;
      const args = ev.args as unknown as PaymentProcessedArgs;
      if (args.orderId.toLowerCase() !== orderIdLower) continue;
      return args;
    } catch {
      /* not our event */
    }
  }
  return null;
}

// Verify a transaction receipt and decode its PaymentProcessed event.
// Writes nothing to any database.
export async function verifyPaymentTx({
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
}): Promise<PaymentProcessedArgs> {
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

  let match: PaymentProcessedArgs | null = null;
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
        metadataHash: (ev.args as unknown as { metadataHash: `0x${string}` }).metadataHash,
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
