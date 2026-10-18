// =============================================================================
// lib/invoice/token.ts — Signed, stateless invoice tokens (no database)
// =============================================================================
// Token format: inv_<base64url(payload)>.<hmac>
// payload = { merchant, amount (base units string), token, decimals,
//             description, externalRef, metadata, escrow, exp }
// The HMAC over the payload makes the token self-validating; the /pay/[token]
// page decodes it and renders the payment UI entirely from the token + chain.
// orderId = keccak256(token).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { keccak256, toHex } from 'viem';
import { env } from '@/lib/env';

export interface InvoiceTokenPayload {
  merchant: string; // lowercase 0x merchant wallet / payout address
  amount: string; // base units as string
  token: string; // token address (0x000... = native ETH)
  decimals: number;
  description?: string;
  externalRef?: string;
  metadata?: Record<string, unknown>;
  escrow?: { milestones: Array<{ title: string; amount: string; releaseInDays: number }> };
  exp: number; // unix seconds
}

const b64urlEncode = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const b64urlDecode = (s: string) => Buffer.from(s, 'base64url');
const sha256Hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

export function createInvoiceToken(payload: InvoiceTokenPayload): string {
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const mac = sha256Hmac(env().INVOICE_SIGNING_SECRET, payloadB64).toString('hex');
  return `inv_${payloadB64}.${mac}`;
}

export function parseInvoiceToken(token: string): InvoiceTokenPayload | null {
  const match = /^inv_(.+)\.([0-9a-f]+)$/.exec(token);
  if (!match) return null;
  const [, payloadB64, mac] = match;

  const expected = sha256Hmac(env().INVOICE_SIGNING_SECRET, payloadB64);
  const given = Buffer.from(mac, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: InvoiceTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as InvoiceTokenPayload;
  } catch {
    return null;
  }

  if (
    !payload.merchant ||
    typeof payload.amount !== 'string' ||
    typeof payload.token !== 'string' ||
    typeof payload.decimals !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    return null;
  }

  // Expiry check.
  if (Math.floor(Date.now() / 1000) > payload.exp) return null;

  return payload;
}

export function invoiceTokenToOrderId(token: string): `0x${string}` {
  return keccak256(toHex(token)) as `0x${string}`;
}
