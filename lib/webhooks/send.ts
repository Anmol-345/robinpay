// =============================================================================
// lib/webhooks/send.ts — Stateless signed webhook delivery (no database)
// =============================================================================
// Signs and POSTs a webhook to a merchant endpoint inline. The per-merchant
// secret is derived via HKDF(MASTER_WEBHOOK_SECRET, merchantAddress) so no
// per-endpoint secrets need to be stored. Delivery failures are not persisted;
// merchants pull missed events via GET /api/v1/events.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { signWebhook } from '@/lib/webhooks/sign';
import { env } from '@/lib/env';

const TOLERANCE_SECS = 300;

// Derive a per-merchant webhook signing secret via HKDF.
export function merchantWebhookSecret(merchantAddress: string): string {
  const ikmd = Buffer.from(env().MASTER_WEBHOOK_SECRET, 'utf8');
  const salt = Buffer.from('robinpay-webhook', 'utf8');
  const info = Buffer.from(merchantAddress.toLowerCase(), 'utf8');

  // Node >= 15 exposes crypto.webcrypto.subtle; deriveKey then deriveBits.
  // Fall back to a deterministic HKDF-expand-like construction using HMAC-SHA256
  // if subtle is unavailable, so this works on all supported Node versions.
  const prk = createHmac('sha256', salt).update(ikmd).digest(); // HKDF-extract (simplified)
  const out: Buffer[] = [];
  let t = Buffer.alloc(0);
  let counter = 1;
  while (out.reduce((a, b) => a + b.length, 0) < 32) {
    t = createHmac('sha256', prk).update(Buffer.concat([t, info, Buffer.from([counter])])).digest();
    out.push(t);
    counter += 1;
  }
  return Buffer.concat(out).subarray(0, 32).toString('hex');
}

// Verify an inbound RobinPay webhook (merchant receiver side). Compute over the
// RAW body — do not JSON.parse + re-serialize before verifying.
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null,
  merchantAddress: string,
): boolean {
  const secret = merchantWebhookSecret(merchantAddress);
  if (!signature) return false;
  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.split('=') as [string, string]),
  );
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECS) return false;

  const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expected = createHmac('sha256', secret).update(t + '.' + bodyStr).digest();
  const given = Buffer.from(parts.v1 ?? '', 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface WebhookEvent {
  type: string;
  merchant: string; // lowercase 0x merchant address
  data: Record<string, unknown>;
}

export async function sendWebhook({
  merchant,
  url,
  event,
}: {
  merchant: string;
  url: string;
  event: WebhookEvent;
}): Promise<{ ok: boolean; statusCode?: number; body?: string }> {
  const secret = merchantWebhookSecret(merchant);
  const rawBody = JSON.stringify(event);
  const { header, timestamp } = signWebhook(secret, rawBody);

  const eventId = (event.data.eventId as string) ?? crypto.randomUUID().replace(/-/g, '').slice(0, 24);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RobinPay-Signature': header,
        'RobinPay-Event-Id': eventId,
        'RobinPay-Timestamp': String(timestamp),
      },
      body: rawBody,
      signal: AbortSignal.timeout(env().WEBHOOK_TIMEOUT_MS),
    });
    const ok = res.status >= 200 && res.status < 300;
    const responseText = await res.text().catch(() => '');
    return { ok, statusCode: res.status, body: responseText.slice(0, 2048) };
  } catch (err) {
    return { ok: false, body: String(err) };
  }
}
