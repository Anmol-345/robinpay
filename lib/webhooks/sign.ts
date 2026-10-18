// =============================================================================
// lib/webhooks/sign.ts — HMAC-SHA256 webhook signing (sender side)
// =============================================================================
import { createHmac, randomBytes } from 'node:crypto';

export interface WebhookSignature {
  header: string; // t=<ts>,v1=<hex>
  timestamp: number;
}

export function signWebhook(
  secret: string,
  rawBody: string,
  timestamp = Math.floor(Date.now() / 1000),
): WebhookSignature {
  const v1 = createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
  return { header: 't=' + timestamp + ',v1=' + v1, timestamp };
}

export function buildEventId(): string {
  return 'evt_' + randomBytes(12).toString('hex');
}
