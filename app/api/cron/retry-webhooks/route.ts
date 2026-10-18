// =============================================================================
// app/api/cron/retry-webhooks/route.ts
// =============================================================================
// Vercel Cron: redelivers PENDING/FAILED webhook rows whose nextRetryAt <= now().
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { dispatchToEndpoint } from '@/lib/webhooks/dispatch';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from('Bearer ' + env().CRON_SECRET);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });

  const now = new Date();
  const due = await prisma.webhookLog.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      nextRetryAt: { lte: now },
    },
    include: { endpoint: true },
    take: 100,
  });

  let delivered = 0;
  let failed = 0;

  for (const log of due) {
    if (log.retryCount >= 5) {
      await prisma.webhookLog.update({ where: { id: log.id }, data: { status: 'DEAD' } });
      failed += 1;
      continue;
    }

    const result = await dispatchToEndpoint({
      endpoint: { url: log.endpoint.url, secretEncrypted: log.endpoint.secretEncrypted },
      event: {
        type: log.eventType,
        merchantId: log.merchantId,
        data: { ...(log.payload as Record<string, unknown>), eventId: log.eventId },
      },
    });

    const next = result.ok ? null : nextRetryAtFrom(log.retryCount ?? 0);
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        status: result.ok ? 'DELIVERED' : 'FAILED',
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        deliveredAt: result.ok ? new Date() : null,
        retryCount: result.ok ? 0 : (log.retryCount ?? 0) + 1,
        nextRetryAt: next,
      },
    });
    if (result.ok) delivered += 1; else failed += 1;
  }

  return NextResponse.json({ processed: due.length, delivered, failed });
}

function nextRetryAtFrom(retryCount: number): Date | null {
  const backoff = [1, 5, 30, 120, 720]; // minutes
  const idx = Math.min(Math.max(retryCount - 1, 0), backoff.length - 1);
  if (retryCount <= 0) return new Date();
  if (retryCount > backoff.length) return null;
  return new Date(Date.now() + backoff[idx] * 60_000);
}
