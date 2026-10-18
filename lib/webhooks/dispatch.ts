// =============================================================================
// lib/webhooks/dispatch.ts — Signed webhook dispatch + retry scheduling
// =============================================================================
// Signs and POSTs an event to a merchant endpoint. Non-2xx responses are
// retried by /api/cron/retry-webhooks with exponential backoff.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { signWebhook } from '@/lib/webhooks/sign';

const TOLERANCE_SECS = 300;

export interface WebhookEvent {
  type: string;
  merchantId: string;
  data: Record<string, unknown>;
}

// Verify an inbound RobinPay webhook (merchant receiver side). Compute over the
// RAW body — do not JSON.parse + re-serialize before verifying.
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null,
  secret: string,
): boolean {
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

// Retry backoff schedule (minutes after previous failure): 1, 5, 30, 120, 720
const BACKOFF_MINUTES = [1, 5, 30, 120, 720];

export function nextRetryAt(retryCount: number): Date | null {
  const idx = Math.min(retryCount, BACKOFF_MINUTES.length - 1);
  const minutes = retryCount === 0 ? 0 : BACKOFF_MINUTES[idx];
  if (minutes <= 0) return new Date();
  return new Date(Date.now() + minutes * 60_000);
}

export function isDead(retryCount: number): boolean {
  return retryCount >= BACKOFF_MINUTES.length;
}

// Sign + dispatch to a single endpoint. Returns whether it was queued.
export async function dispatchToEndpoint({
  endpoint,
  event,
}: {
  endpoint: { url: string; secretEncrypted: string };
  event: WebhookEvent;
}) {
  // NOTE: secretEncrypted is AES-256-GCM ciphertext; decrypt here in production
  // using a key from env. For now we treat the stored value as the raw secret
  // placeholder and sign best-effort so the pipeline compiles.
  const secret = endpoint.secretEncrypted || 'dev-secret';
  const rawBody = JSON.stringify(event);
  const { header, timestamp } = signWebhook(secret, rawBody);

  const body = new TextEncoder().encode(rawBody);
  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RobinPay-Signature': header,
        'RobinPay-Event-Id': (event.data.eventId as string) ?? 'evt_unknown',
        'RobinPay-Timestamp': String(timestamp),
      },
      body,
      signal: AbortSignal.timeout(env().WEBHOOK_TIMEOUT_MS),
    });
    const ok = res.status >= 200 && res.status < 300;
    const responseText = await res.text().catch(() => '');
    return { ok, statusCode: res.status, responseBody: responseText.slice(0, 2048) };
  } catch (err) {
    return { ok: false, statusCode: null, responseBody: String(err) };
  }
}

// Enqueue a WebhookLog row and attempt immediate delivery. Delivery failures are
// retried by /api/cron/retry-webhooks.
export async function enqueueAndDispatch(event: WebhookEvent) {
  // Persist outbox row (PENDING). The merchantId + endpoint resolution happens
  // at dispatch time based on the merchant's active webhook endpoints.
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId: event.merchantId, isActive: true },
    select: { id: true, url: true, secretEncrypted: true, events: true },
  });

  const eventId = (event.data.eventId as string) ?? randomBytes(12).toString('hex');

  for (const endpoint of endpoints) {
    // Filter by subscribed events if the endpoint has an event list
    if (endpoint.events && endpoint.events.length > 0 && !endpoint.events.includes(event.type)) continue;

    await prisma.webhookLog.create({
      data: {
        merchantId: event.merchantId,
        endpointId: endpoint.id,
        eventId,
        eventType: event.type,
        payload: event.data as unknown as InputJsonValue,
        status: 'PENDING',
        nextRetryAt: new Date(),
      },
    });

    void dispatchToEndpoint({ endpoint, event }).then(async (result) => {
      const log = await prisma.webhookLog.findUnique({ where: { eventId } });
      if (!log) return;
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status: result.ok ? 'DELIVERED' : 'FAILED',
          statusCode: result.statusCode,
          responseBody: result.responseBody,
          deliveredAt: result.ok ? new Date() : null,
          retryCount: result.ok ? 0 : (log.retryCount ?? 0) + 1,
          nextRetryAt: result.ok ? null : nextRetryAt((log.retryCount ?? 0) + 1),
        },
      });
    });
  }

  return eventId;
}
