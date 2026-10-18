// =============================================================================
// app/api/v1/events/route.ts
// =============================================================================
// Pull missed events for a merchant. PUBLIC, read-only endpoint.
// Query: ?merchant=0x...&since=<blockNumber>&type=payment.succeeded|...
// Reads router / vault / escrow logs from the blockchain; nothing persisted.
import { NextResponse } from 'next/server';
import { decodeEventLog, type Hex, isAddress } from 'viem';
import { publicClient } from '@/lib/chain/client';
import { ROUTER_ABI } from '@/lib/chain/client';
import { env } from '@/lib/env';
import { checkEventsRateLimit, getClientIp } from '@/lib/rate-limit';

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
  // Rate limit by IP (+ merchant if provided)
  const ip = getClientIp(req);
  const { searchParams } = new URL(req.url);
  const merchant = searchParams.get('merchant');
  const eventsLimit = checkEventsRateLimit(ip, merchant ?? undefined);
  if (!eventsLimit.allowed) {
    return fail(
      'RATE_LIMITED',
      `Too many event requests. Retry after ${eventsLimit.retryAfter}s`,
      429,
    );
  }

  const since = searchParams.get('since');
  const type = searchParams.get('type'); // optional event type filter

  // Validate merchant address if provided
  if (merchant && !isAddress(merchant)) {
    return fail('INVALID_MERCHANT', 'Invalid merchant address', 400);
  }

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
        // Scope to this merchant (indexed address fields) if merchant param given
        if (merchant && !matchesMerchant(args, merchant)) continue;
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
