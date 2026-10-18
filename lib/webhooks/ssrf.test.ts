import { describe, it, expect } from 'vitest';
import { isSsrSafeUrl } from '@/lib/cors';

describe('SSRF blocklist', () => {
  it('allows https public URLs', () => {
    expect(isSsrSafeUrl('https://api.merchant.com/webhooks')).toBe(true);
    expect(isSsrSafeUrl('https://example.com/hook')).toBe(true);
  });

  it('blocks http URLs', () => {
    expect(isSsrSafeUrl('http://api.merchant.com/webhooks')).toBe(false);
  });

  it('blocks localhost', () => {
    expect(isSsrSafeUrl('https://localhost/webhook')).toBe(false);
    expect(isSsrSafeUrl('https://127.0.0.1/webhook')).toBe(false);
    expect(isSsrSafeUrl('https://[::1]/webhook')).toBe(false);
  });

  it('blocks link-local 169.254.x.x', () => {
    expect(isSsrSafeUrl('https://169.254.169.254/metadata')).toBe(false);
  });

  it('blocks private 10.x.x.x', () => {
    expect(isSsrSafeUrl('https://10.0.0.1/webhook')).toBe(false);
  });

  it('blocks private 172.16-31.x.x', () => {
    expect(isSsrSafeUrl('https://172.16.0.1/webhook')).toBe(false);
    expect(isSsrSafeUrl('https://172.31.255.255/webhook')).toBe(false);
    expect(isSsrSafeUrl('https://172.15.0.1/webhook')).toBe(true);
    expect(isSsrSafeUrl('https://172.32.0.1/webhook')).toBe(true);
  });

  it('blocks private 192.168.x.x', () => {
    expect(isSsrSafeUrl('https://192.168.1.1/webhook')).toBe(false);
  });

  it('blocks IPv6 link-local fe80::', () => {
    expect(isSsrSafeUrl('https://[fe80::1]/webhook')).toBe(false);
  });

  it('blocks IPv6 unique local fc00::/7', () => {
    expect(isSsrSafeUrl('https://[fc00::1]/webhook')).toBe(false);
    expect(isSsrSafeUrl('https://[fd00::1]/webhook')).toBe(false);
  });
});
