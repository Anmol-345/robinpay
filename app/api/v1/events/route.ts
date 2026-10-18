// =============================================================================
// app/api/v1/events/route.ts
// =============================================================================
// Pull missed events for a merchant. Reads router / vault / escrow logs from
// the blockchain; nothing is persisted server-side.
// Query: ?since=<blockNumber>&type=payment.succeeded|subscription.charged|...
// Auth: sk_ key.
import { NextResponse } from 'next/server';
import { decodeEventLog, type Hex } from 'viem';
import { publicClient } from '@/lib/chain/client';
import { ROUTER_ABI } from '@/lib/chain/client';
import { authenticate } from '@/lib/auth/stateless';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

const SCAN_WINDOW = 5000; // blocks per request

interface LogEntry {
  address: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  data: Hex;
  topics: [] | [`0x${string}`, ...`0x${string}`[]];
}

interface OutEvent {
  type: string;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  args: Record<string, unknown>;
}

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const type = searchParams.get('type'); // optional event type filter

  const head = await publicClient().getBlockNumber();
  const fromBlock = since ? BigInt(since) : head - BigInt(SCAN_WINDOW);

  const events: OutEvent[] = [];

  const addLogs = (logs: LogEntry[], eventName: string) => {
    for (const log of logs) {
      try {
        const ev = decodeEventLog({
          abi: ROUTER_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (ev.eventName !== eventName) continue;
        const args = ev.args as unknown as Record<string, unknown>;
        if (type && ev.eventName !== type) continue;
        // Scope to this merchant (indexed address fields).
        if (!matchesMerchant(args, auth.merchant)) continue;
        events.push({
          type: ev.eventName,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          args,
        });
      } catch {
        /* not our event */
      }
    }
  };

  const paymentProcessedAbi = ROUTER_ABI.find(
    (a) => a.type === 'event' && a.name === 'PaymentProcessed',
  );
  if (paymentProcessedAbi) {
    const routerLogs = await publicClient().getLogs({
      address: env().PAYMENT_ROUTER_ADDRESS as `0x${string}`,
      event: paymentProcessedAbi as unknown as Extract<typeof ROUTER_ABI[number], { type: 'event' }>,
      fromBlock,
      toBlock: head,
    });
    addLogs(routerLogs as unknown as LogEntry[], 'PaymentProcessed');
  }

  return NextResponse.json({ events, fromBlock: fromBlock.toString(), head: head.toString() });
}

// Heuristic: match any indexed address argument to the merchant.
function matchesMerchant(args: Record<string, unknown>, merchant: string): boolean {
  const m = merchant.toLowerCase();
  for (const v of Object.values(args)) {
    if (typeof v === 'string' && v.startsWith('0x') && v.toLowerCase() === m) return true;
  }
  return false;
}
