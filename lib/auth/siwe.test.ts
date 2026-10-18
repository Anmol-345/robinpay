import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/siwe';

describe('SIWE session cookie', () => {
  const session = {
    address: '0x1234567890123456789012345678901234567890',
    chainId: 4663,
    iat: Math.floor(Date.now() / 1000),
    nonce: 'nonce123',
  };

  it('signs and verifies a session cookie', () => {
    const token = signSession(session);
    expect(token.split('.').length).toBe(3);
    const parsed = verifySession(token);
    expect(parsed).toMatchObject(session);
  });

  it('rejects a tampered cookie', () => {
    const token = signSession(session);
    const tampered = token.replace(/[0-9a-f]+$/, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(verifySession(tampered)).toBeNull();
  });

  it('rejects an expired cookie', () => {
    const old = signSession({ ...session, iat: Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60 });
    expect(verifySession(old)).toBeNull();
  });

  it('rejects malformed cookies', () => {
    expect(verifySession('not-a-session')).toBeNull();
    expect(verifySession('')).toBeNull();
  });
});
