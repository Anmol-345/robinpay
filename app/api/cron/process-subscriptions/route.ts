// =============================================================================
// app/api/cron/process-subscriptions/route.ts
// =============================================================================
// Vercel Cron: selects due subscriptions, leases them to prevent double-processing,
// simulates claimBatch, submits with the operator key, and persists results.
// Secured with CRON_SECRET (constant-time compare).
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { publicClient, operatorWallet } from '@/lib/chain/client';
import { SUBSCRIPTION_VAULT_ABI } from '@/lib/chain/client';
import { env } from '@/lib/env';
import { enqueueAndDispatch } from '@/lib/webhooks/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH = 50;

function authorized(req: Request) {
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from('Bearer ' + env().CRON_SECRET);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });

  const now = new Date();
  const lease = new Date(now.getTime() + 5 * 60_000);

  // 1) Lease a batch atomically (SKIP LOCKED avoids contention between runs)
  const due = await prisma.$queryRaw<{ id: string; onchainSubId: string }[]>`
    UPDATE "Subscription" SET "lockedUntil" = ${lease}
    WHERE id IN (
      SELECT id FROM "Subscription"
      WHERE status IN ('ACTIVE','TRIALING','PAST_DUE')
        AND "nextChargeAt" <= ${now}
        AND ("lockedUntil" IS NULL OR "lockedUntil" < ${now})
      ORDER BY "nextChargeAt" ASC
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "onchainSubId"::text AS "onchainSubId"`;
  if (due.length === 0) return NextResponse.json({ processed: 0 });

  const subIds = due.map((d) => BigInt(d.onchainSubId));

  try {
    // 2) Simulate first: catches reverts and estimates gas without spending it
    const { request, result } = await publicClient().simulateContract({
      address: env().SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
      abi: SUBSCRIPTION_VAULT_ABI,
      functionName: 'claimBatch',
      args: [subIds],
      account: operatorWallet().account,
    });

    // 3) Submit and wait for confirmation
    const hash = await operatorWallet().writeContract(request);
    await publicClient().waitForTransactionReceipt({ hash });

    // 4) Persist results per subscription
    for (let i = 0; i < due.length; i++) {
      const ok = result[i];
      const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: due[i].id }, include: { plan: true } });
      if (ok) {
        const next = new Date(sub.nextChargeAt.getTime() + sub.plan.intervalSecs * 1000);
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: { nextChargeAt: next, chargesMade: { increment: 1 }, failedAttempts: 0, status: 'ACTIVE', lockedUntil: null },
          }),
          prisma.subscriptionCharge.create({ data: { subscriptionId: sub.id, status: 'SUCCEEDED', amount: sub.plan.amount, txHash: hash } }),
        ]);
        void enqueueAndDispatch({
          type: 'subscription.charged',
          merchantId: sub.merchantId,
          data: { eventId: 'evt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24), subscriptionId: sub.id, txHash: hash },
        });
      } else {
        const attempts = sub.failedAttempts + 1;
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: {
              failedAttempts: attempts,
              status: attempts >= 3 ? 'PAST_DUE' : sub.status,
              nextChargeAt: new Date(Date.now() + 24 * 3600_000),
              lockedUntil: null,
            },
          }),
          prisma.subscriptionCharge.create({ data: { subscriptionId: sub.id, status: 'FAILED', amount: sub.plan.amount, failureReason: 'allowance_or_balance' } }),
        ]);
        void enqueueAndDispatch({
          type: 'subscription.payment_failed',
          merchantId: sub.merchantId,
          data: { eventId: 'evt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24), subscriptionId: sub.id, attempts },
        });
      }
    }
    return NextResponse.json({ processed: due.length, txHash: hash });
  } catch (err) {
    // Release leases so the next run can retry
    await prisma.subscription.updateMany({ where: { id: { in: due.map((d) => d.id) } }, data: { lockedUntil: null } });
    console.error('process-subscriptions failed', err);
    return NextResponse.json({ error: 'batch_failed' }, { status: 500 });
  }
}
