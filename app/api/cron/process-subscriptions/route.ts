// =============================================================================
// app/api/cron/process-subscriptions/route.ts
// =============================================================================
// Vercel Cron: reads due subscription ids from the SubscriptionVault contract,
// simulates claimBatch, submits with the operator key, and decodes Charged /
// ChargeFailed logs from the receipt. No lease or lockedUntil logic; the
// on-chain NotDue check is the final backstop. Secured with CRON_SECRET.
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { decodeEventLog, type Hex } from 'viem';
import { publicClient, operatorWallet } from '@/lib/chain/client';
import { SUBSCRIPTION_VAULT_ABI } from '@/lib/chain/client';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH = 50;

function authorized(req: Request) {
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from('Bearer ' + env().CRON_SECRET);
  return got.length === want.length && timingSafeEqual(got, want);
}

interface ChargeResult {
  subId: bigint;
  ok: boolean;
  amount?: bigint;
  fee?: bigint;
  nextChargeAt?: bigint;
  failedAttempts?: number;
  reason?: string;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });

  // 1) Read due subscription ids from the contract (paginated, offset 0).
  const due = (await publicClient().readContract({
    address: env().SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
    abi: SUBSCRIPTION_VAULT_ABI,
    functionName: 'getDueSubscriptions',
    args: [0n, BigInt(BATCH)],
  })) as bigint[];

  if (due.length === 0) return NextResponse.json({ processed: 0 });

  try {
    // 2) Simulate first: catches reverts and estimates gas without spending it.
    const { request } = await publicClient().simulateContract({
      address: env().SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
      abi: SUBSCRIPTION_VAULT_ABI,
      functionName: 'claimBatch',
      args: [due as bigint[]],
      account: operatorWallet().account,
    });

    // 3) Submit and wait for confirmation.
    const hash = await operatorWallet().writeContract(request);
    const receipt = await publicClient().waitForTransactionReceipt({ hash });

    // 4) Decode Charged / ChargeFailed logs from the receipt.
    const results: ChargeResult[] = [];

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== env().SUBSCRIPTION_VAULT_ADDRESS.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({
          abi: SUBSCRIPTION_VAULT_ABI,
          data: log.data as Hex,
          topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
        });
        if (ev.eventName === 'Charged') {
          const args = ev.args as unknown as { subId: bigint; amount: bigint; fee: bigint; nextChargeAt: bigint };
          results.push({ subId: args.subId, ok: true, amount: args.amount, fee: args.fee, nextChargeAt: args.nextChargeAt });
        } else if (ev.eventName === 'ChargeFailed') {
          const args = ev.args as unknown as { subId: bigint; failedAttempts: number; reason: Hex };
          results.push({ subId: args.subId, ok: false, failedAttempts: args.failedAttempts, reason: args.reason });
        }
      } catch {
        /* not our event */
      }
    }

    return NextResponse.json({ processed: due.length, txHash: hash, results });
  } catch (err) {
    console.error('process-subscriptions failed', err);
    return NextResponse.json({ error: 'batch_failed' }, { status: 500 });
  }
}
