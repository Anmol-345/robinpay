// =============================================================================
// lib/auth/siwe.ts — SIWE login + signed httpOnly session cookie (no database)
// =============================================================================
// Sign-In with Ethereum. The merchant connects a wallet, signs a SIWE message,
// and receives a signed httpOnly session cookie. The cookie value is a JWT-like
// HMAC-SHA256 token: base64url(header).base64url(payload).hmac.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { verifyMessage, isAddress, getAddress } from 'viem';
import { env } from '@/lib/env';

const SESSION_COOKIE = 'rp_session';
const SESSION_TTL_SECS = 7 * 24 * 60 * 60; // 7 days

export interface SiweSession {
  address: string; // lowercase 0x merchant wallet
  chainId: number;
  iat: number;
  nonce: string;
}

const b64urlEncode = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const b64urlDecode = (s: string) => Buffer.from(s, 'base64url');
const sha256Hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

export function signSession(session: SiweSession): string {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64urlEncode(JSON.stringify(session));
  const signingInput = `${header}.${payload}`;
  const mac = sha256Hmac(env().SESSION_SECRET, signingInput).toString('hex');
  return `${signingInput}.${mac}`;
}

export function verifySession(token: string): SiweSession | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, mac] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const expected = sha256Hmac(env().SESSION_SECRET, signingInput);
  const given = Buffer.from(mac, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let session: SiweSession;
  try {
    session = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as SiweSession;
  } catch {
    return null;
  }

  if (!session.address || typeof session.chainId !== 'number' || typeof session.iat !== 'number') {
    return null;
  }

  if (Math.floor(Date.now() / 1000) - session.iat > SESSION_TTL_SECS) return null;

  return session;
}

export async function getSession(): Promise<SiweSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(session: SiweSession): string {
  return signSession(session);
}

export function clearSessionCookie(): string {
  return '';
}

// Build a SIWE message for the merchant to sign.
export function buildSiweMessage({
  address,
  chainId,
  nonce,
  issuedAt,
  domain,
}: {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
  issuedAt: string;
  domain: string;
}): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to RobinPay as a merchant.',
    '',
    `URI: https://${domain}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    '',
  ].join('\n');
}

// Verify a SIWE signature over the message. The signer address is embedded in
// the SIWE message (2nd line); verifyMessage checks the signature against it.
export async function verifySiweSignature(params: {
  message: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  const lines = params.message.split('\n');
  const addressLine = lines[1]?.trim();
  if (!addressLine || !isAddress(addressLine)) return false;
  try {
    return await verifyMessage({
      address: getAddress(addressLine),
      message: params.message,
      signature: params.signature,
    });
  } catch {
    return false;
  }
}
