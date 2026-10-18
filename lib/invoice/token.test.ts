import { describe, it, expect } from 'vitest';
import { createInvoiceToken, parseInvoiceToken, invoiceTokenToOrderId } from '@/lib/invoice/token';

describe('stateless invoice tokens', () => {
  const payload = {
    merchant: '0x1234567890123456789012345678901234567890',
    amount: '1000000',
    token: '0xabcdef0123456789abcdef0123456789abcdef01',
    decimals: 6,
    description: 'Test invoice',
    externalRef: 'ext-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  it('creates and parses a signed invoice token', () => {
    const token = createInvoiceToken(payload);
    expect(token).toMatch(/^inv_[^.]+\.[0-9a-f]+$/);

    const parsed = parseInvoiceToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject(payload);
  });

  it('supports verified and webhookToken fields', () => {
    const token = createInvoiceToken({
      ...payload,
      verified: true,
      webhookToken: 'whc_abc123.def456',
    });
    const parsed = parseInvoiceToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.verified).toBe(true);
    expect(parsed!.webhookToken).toBe('whc_abc123.def456');
  });

  it('derives orderId = keccak256(token)', () => {
    const token = createInvoiceToken(payload);
    const orderId = invoiceTokenToOrderId(token);
    expect(orderId.startsWith('0x')).toBe(true);
    expect(orderId.length).toBe(66);
  });

  it('rejects a tampered token', () => {
    const token = createInvoiceToken(payload);
    const tampered = token.replace(/[0-9a-f]+$/, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(parseInvoiceToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = createInvoiceToken({ ...payload, exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(parseInvoiceToken(expired)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(parseInvoiceToken('not-a-token')).toBeNull();
    expect(parseInvoiceToken('')).toBeNull();
  });
});
