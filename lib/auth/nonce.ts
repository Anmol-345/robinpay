// =============================================================================
// lib/auth/nonce.ts — Stateless SIWE nonces (HMAC-signed, no storage)
// =============================================================================
// Nonces are self-validating tokens: base64url(payload).hmac where payload
// = { address, timestamp }. The server verifies the HMAC and rejects nonces
// older than 5 minutes. No storage required.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

const NONCE_TTL_SECS = 5 * 60; // 5 minutes

const b64urlEncode = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const b64urlDecode = (s: string) => Buffer.from(s, 'base64url');
const sha256Hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

// Create a stateless nonce for a given address.
// Format: nonce_<base64url(payload)>.<hmac>
export function createNonce(address: string): string {
  const payload = { address: address.toLowerCase(), timestamp: Math.floor(Date.now() / 1000) };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const mac = sha256Hmac(env().SESSION_SECRET, payloadB64).toString('hex');
  return `nonce_${payloadB64}.${mac}`;
}

// Verify a nonce and return the embedded address if valid.
export function verifyNonce(token: string): string | null {
  const match = /^nonce_(.+)\.([0-9a-f]+)$/.exec(token);
  if (!match) return null;
  const [, payloadB64, mac] = match;

  const expected = sha256Hmac(env().SESSION_SECRET, payloadB64);
  const given = Buffer.from(mac, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: { address: string; timestamp: number };
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return null;
  }

  if (!payload.address || typeof payload.timestamp !== 'number') return null;

  // Reject nonces older than 5 minutes.
  if (Math.floor(Date.now() / 1000) - payload.timestamp > NONCE_TTL_SECS) return null;

  return payload.address.toLowerCase();
}
