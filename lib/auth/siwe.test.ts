import { describe, it, expect } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { signSession, verifySession, buildSiweMessage, verifySiweSignature } from '@/lib/auth/siwe';

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

  it('builds SIWE message and verifies signature from a wallet', async () => {
    // Standard Hardhat / Anvil account 0 private key
    const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
    const msg = buildSiweMessage({
      address: account.address,
      chainId: 4663,
      nonce: 'abc123nonce',
      issuedAt: new Date().toISOString(),
      domain: 'localhost:3000',
    });

    const lines = msg.split('\n');
    expect(lines[1]).toBe(account.address);

    const signature = await account.signMessage({ message: msg });
    const verified = await verifySiweSignature({ message: msg, signature });
    expect(verified).toBe(true);

    // Tampered message should fail
    const tamperedMsg = msg.replace('4663', '1');
    const failVerified = await verifySiweSignature({ message: tamperedMsg, signature });
    expect(failVerified).toBe(false);
  });
});

