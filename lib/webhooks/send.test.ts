import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { merchantWebhookSecret, verifyWebhookSignature } from '@/lib/webhooks/send';

describe('webhook signing (HKDF per-merchant secret)', () => {
  const merchant = '0x1234567890123456789012345678901234567890';

  it('derives a per-merchant secret and verifies a signature', () => {
    const secret = merchantWebhookSecret(merchant);
    expect(typeof secret).toBe('string');
    expect(secret.length).toBe(64); // 32 bytes hex

    const rawBody = JSON.stringify({ type: 'payment.succeeded', data: { amount: '100' } });
    const ts = Math.floor(Date.now() / 1000);
    const v1 = createHmac('sha256', secret).update(ts + '.' + rawBody).digest('hex');
    const signature = `t=${ts},v1=${v1}`;

    expect(verifyWebhookSignature(rawBody, signature, merchant)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const secret = merchantWebhookSecret(merchant);
    const ts = Math.floor(Date.now() / 1000);
    const v1 = createHmac('sha256', secret).update(ts + '.' + 'original').digest('hex');
    expect(verifyWebhookSignature('tampered', `t=${ts},v1=${v1}`, merchant)).toBe(false);
  });

  it('rejects an old timestamp', () => {
    const secret = merchantWebhookSecret(merchant);
    const oldTs = Math.floor(Date.now() / 1000) - 600;
    const v1 = createHmac('sha256', secret).update(oldTs + '.{}').digest('hex');
    expect(verifyWebhookSignature('{}', `t=${oldTs},v1=${v1}`, merchant)).toBe(false);
  });

  it('derives different secrets for different merchants', () => {
    expect(merchantWebhookSecret('0xaaa')).not.toBe(merchantWebhookSecret('0xbbb'));
  });
});
