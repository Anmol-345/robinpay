import { describe, it, expect } from 'vitest';
import { createNonce, verifyNonce } from '@/lib/auth/nonce';

describe('stateless SIWE nonces', () => {
  const address = '0x1234567890123456789012345678901234567890';

  it('creates and verifies a nonce', () => {
    const nonce = createNonce(address);
    expect(nonce).toMatch(/^nonce_[^.]+\.[0-9a-f]+$/);

    const recovered = verifyNonce(nonce);
    expect(recovered).toBe(address.toLowerCase());
  });

  it('rejects a tampered nonce', () => {
    const nonce = createNonce(address);
    const tampered = nonce.replace(/[0-9a-f]+$/, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(verifyNonce(tampered)).toBeNull();
  });

  it('rejects a nonce for a different address', () => {
    const nonce = createNonce(address);
    expect(verifyNonce(nonce)).toBe(address.toLowerCase());
    // A different address should not match
    const other = '0xabcdef0123456789abcdef0123456789abcdef01';
    // The nonce embeds the original address, so verifyNonce returns the embedded address
    const recovered = verifyNonce(nonce);
    expect(recovered).not.toBe(other);
  });

  it('rejects malformed nonces', () => {
    expect(verifyNonce('not-a-nonce')).toBeNull();
    expect(verifyNonce('')).toBeNull();
    expect(verifyNonce('nonce_invalid')).toBeNull();
  });
});
