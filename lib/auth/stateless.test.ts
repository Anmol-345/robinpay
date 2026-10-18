import { describe, it, expect } from 'vitest';
import {
  createSecretKey,
  authenticateSecretKey,
  type AuthResult,
} from '@/lib/auth/stateless';

const merchant = '0x1234567890123456789012345678901234567890';

describe('stateless API keys', () => {
  it('creates and authenticates a self-validating sk_ key', () => {
    const token = createSecretKey(merchant, 'live', {
      keyId: 'key_1',
      keyVersion: 1,
      webhookUrl: 'https://merchant.example/webhook',
    });
    expect(token).toMatch(/^sk_live_[^.]+\.[0-9a-f]+$/);

    const result = authenticateSecretKey(token);
    expect(result).toMatchObject<AuthResult>({
      merchant,
      env: 'live',
      keyId: 'key_1',
      keyVersion: 1,
      webhookUrl: 'https://merchant.example/webhook',
      isSecret: true,
    });
  });

  it('rejects a tampered HMAC', () => {
    const token = createSecretKey(merchant, 'live');
    const tampered = token.replace(/[0-9a-f]+$/, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(authenticateSecretKey(tampered)).toBeNull();
  });

  it('rejects a revoked keyVersion (below MIN_KEY_VERSION)', () => {
    // MIN_KEY_VERSION defaults to 1; a keyVersion of 0 should be revoked.
    const token = createSecretKey(merchant, 'live', { keyVersion: 0 });
    expect(authenticateSecretKey(token)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(authenticateSecretKey('not-a-key')).toBeNull();
    expect(authenticateSecretKey('pk_live_abc')).toBeNull();
    expect(authenticateSecretKey('')).toBeNull();
  });
});
