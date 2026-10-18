// =============================================================================
// lib/auth/stateless.ts — Self-validating API keys (no database)
// =============================================================================
// Key format: sk_<env>_<base64url(payload)>.<hmac>
// payload = { merchant, keyId, keyVersion, iat, webhookUrl? }
// The HMAC (over "<env>.<payload>") makes the key self-validating; nothing is
// stored server-side. Revocation is handled by keyVersion vs MIN_KEY_VERSION.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

type KeyEnv = 'live' | 'test';

export interface ApiKeyPayload {
  merchant: string; // merchant wallet address (lowercase 0x)
  keyId: string;
  keyVersion: number;
  iat: number; // issued at, unix seconds
  webhookUrl?: string;
}

export interface AuthResult {
  merchant: string;
  env: KeyEnv;
  keyId: string;
  keyVersion: number;
  webhookUrl?: string;
  isSecret: boolean;
}

const b64urlEncode = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64url');

const b64urlDecode = (s: string): Buffer => Buffer.from(s, 'base64url');

const sha256Hmac = (secret: string, data: string): Buffer =>
  createHmac('sha256', secret).update(data).digest();

export function createSecretKey(
  merchant: string,
  keyEnv: KeyEnv,
  opts: { keyId?: string; keyVersion?: number; webhookUrl?: string; iat?: number } = {},
): string {
  const payload: ApiKeyPayload = {
    merchant: merchant.toLowerCase(),
    keyId: opts.keyId ?? crypto.randomUUID(),
    keyVersion: opts.keyVersion ?? env().MIN_KEY_VERSION,
    iat: opts.iat ?? Math.floor(Date.now() / 1000),
    webhookUrl: opts.webhookUrl,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signingInput = `${keyEnv}.${payloadB64}`;
  const mac = sha256Hmac(env().API_KEY_SIGNING_SECRET, signingInput).toString('hex');
  return `sk_${keyEnv}_${payloadB64}.${mac}`;
}

export function parseSecretKey(token: string): { env: KeyEnv; payloadB64: string; mac: string } | null {
  const match = /^sk_(live|test)_(.+)\.([0-9a-f]+)$/.exec(token);
  if (!match) return null;
  return { env: match[1] as KeyEnv, payloadB64: match[2], mac: match[3] };
}

export function authenticateSecretKey(token: string): AuthResult | null {
  const parsed = parseSecretKey(token);
  if (!parsed) return null;

  let payload: ApiKeyPayload;
  try {
    payload = JSON.parse(b64urlDecode(parsed.payloadB64).toString('utf8')) as ApiKeyPayload;
  } catch {
    return null;
  }

  if (!payload.merchant || !payload.keyId || typeof payload.keyVersion !== 'number' || typeof payload.iat !== 'number') {
    return null;
  }

  // Key version revocation: keys below MIN_KEY_VERSION are revoked.
  if (payload.keyVersion < env().MIN_KEY_VERSION) return null;

  // Token age: reject keys older than 90 days (defense in depth).
  const maxAgeSecs = 90 * 24 * 60 * 60;
  if (Math.floor(Date.now() / 1000) - payload.iat > maxAgeSecs) return null;

  const signingInput = `${parsed.env}.${parsed.payloadB64}`;
  const expected = sha256Hmac(env().API_KEY_SIGNING_SECRET, signingInput);
  const given = Buffer.from(parsed.mac, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  return {
    merchant: payload.merchant,
    env: parsed.env,
    keyId: payload.keyId,
    keyVersion: payload.keyVersion,
    webhookUrl: payload.webhookUrl,
    isSecret: true,
  };
}

export function authenticateApiKey(req: Request): AuthResult | null {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  // pk_ keys are not supported in the database-free model; the browser uses a
  // signed SIWE session cookie instead.
  if (token.startsWith('pk_')) return null;
  if (!token.startsWith('sk_')) return null;

  return authenticateSecretKey(token);
}

// Convenience alias used by route handlers.
export const authenticate = authenticateApiKey;

export function requireSecretKey(req: Request): AuthResult | null {
  return authenticateApiKey(req);
}
