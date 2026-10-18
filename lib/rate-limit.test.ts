import { describe, it, expect } from 'vitest';
import {
  checkInvoiceRateLimit,
  checkVerifyRateLimit,
  checkEventsRateLimit,
} from '@/lib/rate-limit';

describe('rate limiting', () => {
  const ip = '192.168.1.1';
  const merchant = '0x1234567890123456789012345678901234567890';

  it('invoice rate limit allows requests under the limit', () => {
    const result = checkInvoiceRateLimit(ip, merchant);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('invoice rate limit blocks after limit exceeded', () => {
    // Consume all 30 requests
    for (let i = 0; i < 30; i++) {
      checkInvoiceRateLimit(ip, merchant);
    }
    const result = checkInvoiceRateLimit(ip, merchant);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('verify rate limit allows 120 requests per minute per IP', () => {
    const result = checkVerifyRateLimit(ip);
    expect(result.allowed).toBe(true);
  });

  it('events rate limit allows 60 requests per minute per IP', () => {
    const result = checkEventsRateLimit(ip, merchant);
    expect(result.allowed).toBe(true);
  });

  it('per-IP and per-merchant limits are independent', () => {
    // Use up IP limit for invoices
    for (let i = 0; i < 30; i++) {
      checkInvoiceRateLimit(ip, merchant);
    }
    // IP is now exhausted for invoices
    expect(checkInvoiceRateLimit(ip, merchant).allowed).toBe(false);
    // But a different IP AND different merchant should still work
    expect(
      checkInvoiceRateLimit('10.0.0.1', '0xabcdef0123456789abcdef0123456789abcdef01').allowed
    ).toBe(true);
  });
});
