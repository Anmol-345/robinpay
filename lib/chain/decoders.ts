// =============================================================================
// lib/chain/decoders.ts — Log decoding helpers
// =============================================================================
import { decodeEventLog, type Hex } from 'viem';
import { ROUTER_ABI } from '@/lib/chain/client';

export interface PaymentProcessedLog {
  orderId: `0x${string}`;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  token: `0x${string}`;
  gross: bigint;
  fee: bigint;
  net: bigint;
  metadataHash: `0x${string}`;
  logIndex: number;
}

export function decodePaymentProcessedLog({
  data,
  topics,
  logIndex,
}: {
  data: Hex;
  topics: Hex[];
  logIndex: number;
}): PaymentProcessedLog | null {
  try {
    const ev = decodeEventLog({
      abi: ROUTER_ABI,
      data,
      topics: topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
    });
    if (ev.eventName !== 'PaymentProcessed') return null;
    const args = ev.args as unknown as PaymentProcessedLog;
    return { ...args, logIndex };
  } catch {
    return null;
  }
}
