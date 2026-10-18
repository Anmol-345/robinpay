// =============================================================================
// app/api/v1/webhooks/test/route.ts
// =============================================================================
// Test endpoint: sends a sample signed webhook to a merchant URL (dev only).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signWebhook } from '@/lib/webhooks/sign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  url: z.string().url(),
  secret: z.string().min(1),
  eventType: z.string().default('payment.succeeded'),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } }, { status: 400 });
  const { url, secret, eventType } = parsed.data;

  const event = {
    eventId: 'evt_test_' + Date.now(),
    type: eventType,
    data: { invoiceId: 'inv_test', amount: '1000000', status: 'PAID' },
  };
  const rawBody = JSON.stringify(event);
  const { header, timestamp } = signWebhook(secret, rawBody);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'RobinPay-Signature': header,
      'RobinPay-Event-Id': event.eventId,
      'RobinPay-Timestamp': String(timestamp),
    },
    body: rawBody,
  });

  return NextResponse.json({ status: res.status, body: await res.text() });
}
