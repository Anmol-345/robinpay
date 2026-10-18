// =============================================================================
// app/api/v1/webhooks/test/route.ts
// =============================================================================
// Test endpoint: sends a sample signed webhook to a merchant URL (dev only).
// Uses the stateless per-merchant HKDF secret; nothing is persisted.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendWebhook } from '@/lib/webhooks/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  url: z.string().url(),
  merchant: z.string().refine((v) => v.startsWith('0x') && v.length === 42, 'Invalid merchant address'),
  eventType: z.string().default('payment.succeeded'),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } }, { status: 400 });
  const { url, merchant, eventType } = parsed.data;

  const event = {
    eventId: 'evt_test_' + Date.now(),
    type: eventType,
    merchant,
    data: { invoiceId: 'inv_test', amount: '1000000', status: 'PAID' },
  };

  const result = await sendWebhook({ merchant, url, event });
  return NextResponse.json({ status: result.ok ? 200 : 502, body: result.body });
}
