// =============================================================================
// lib/eip712.ts — EIP-712 typed data signing/verification (no database)
// =============================================================================
// Used for:
//   1. Optional merchant-signed invoices (anti-impersonation on /pay/[token])
//   2. Stateless webhook config registration (merchant signs { merchant, url, events, expiry })
// Verification uses viem recoverTypedData; nothing is stored server-side.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { recoverTypedDataAddress } from 'viem';
import { env } from '@/lib/env';

const b64urlEncode = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const b64urlDecode = (s: string) => Buffer.from(s, 'base64url');

// EIP-712 domain for invoice signatures.
const INVOICE_DOMAIN = {
  name: 'RobinPay Invoice',
  version: '1',
  chainId: 4663,
  verifyingContract: '0x0000000000000000000000000000000000000000',
} as const;

const INVOICE_TYPES = {
  Invoice: [
    { name: 'merchant', type: 'address' },
    { name: 'amount', type: 'string' },
    { name: 'token', type: 'address' },
    { name: 'decimals', type: 'uint8' },
    { name: 'description', type: 'string' },
    { name: 'externalRef', type: 'string' },
    { name: 'exp', type: 'uint64' },
    { name: 'webhookToken', type: 'string' },
  ] as const,
};

// Verify an EIP-712 invoice signature. Returns the signer address if valid.
export async function verifyInvoiceSignature({
  signature,
  payload,
}: {
  signature: `0x${string}`;
  payload: {
    merchant: `0x${string}`;
    amount: string;
    token: `0x${string}`;
    decimals: number;
    description?: string;
    externalRef?: string;
    exp: number;
    webhookToken?: string;
  };
}): Promise<`0x${string}` | null> {
  try {
    const recovered = await recoverTypedDataAddress({
      domain: INVOICE_DOMAIN,
      types: INVOICE_TYPES,
      primaryType: 'Invoice',
      message: {
        merchant: payload.merchant,
        amount: payload.amount,
        token: payload.token,
        decimals: payload.decimals,
        description: payload.description ?? '',
        externalRef: payload.externalRef ?? '',
        exp: BigInt(payload.exp),
        webhookToken: payload.webhookToken ?? '',
      },
      signature,
    });
    return recovered as `0x${string}`;
  } catch {
    return null;
  }
}

// EIP-712 domain for webhook config signatures.
const WEBHOOK_CONFIG_DOMAIN = {
  name: 'RobinPay Webhook Config',
  version: '1',
  chainId: 4663,
  verifyingContract: '0x0000000000000000000000000000000000000000',
} as const;

const WEBHOOK_CONFIG_TYPES = {
  WebhookConfig: [
    { name: 'merchant', type: 'address' },
    { name: 'url', type: 'string' },
    { name: 'events', type: 'string' },
    { name: 'expiry', type: 'uint64' },
  ] as const,
};

// Verify an EIP-712 webhook config signature.
export async function verifyWebhookConfigSignature({
  signature,
  payload,
}: {
  signature: `0x${string}`;
  payload: {
    merchant: `0x${string}`;
    url: string;
    events: string;
    expiry: number;
  };
}): Promise<`0x${string}` | null> {
  try {
    const recovered = await recoverTypedDataAddress({
      domain: WEBHOOK_CONFIG_DOMAIN,
      types: WEBHOOK_CONFIG_TYPES,
      primaryType: 'WebhookConfig',
      message: {
        merchant: payload.merchant,
        url: payload.url,
        events: payload.events,
        expiry: BigInt(payload.expiry),
      },
      signature,
    });
    return recovered as `0x${string}`;
  } catch {
    return null;
  }
}

// Create a stateless webhook config token (HMAC with WEBHOOK_CONFIG_SECRET).
// Format: whc_<base64url(payload)>.<hmac>
export function createWebhookConfigToken(payload: {
  merchant: string;
  url: string;
  events: string[];
  expiry: number;
}): string {
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const mac = createHmac('sha256', env().WEBHOOK_CONFIG_SECRET).update(payloadB64).digest('hex');
  return `whc_${payloadB64}.${mac}`;
}

// Parse and verify a webhook config token.
export function parseWebhookConfigToken(token: string): {
  merchant: string;
  url: string;
  events: string[];
  expiry: number;
} | null {
  const match = /^whc_(.+)\.([0-9a-f]+)$/.exec(token);
  if (!match) return null;
  const [, payloadB64, mac] = match;
  const expected = createHmac('sha256', env().WEBHOOK_CONFIG_SECRET).update(payloadB64).digest();
  const given = Buffer.from(mac, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let payload: { merchant: string; url: string; events: string[]; expiry: number };
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  if (
    !payload.merchant ||
    typeof payload.url !== 'string' ||
    !Array.isArray(payload.events) ||
    typeof payload.expiry !== 'number'
  ) {
    return null;
  }
  if (Math.floor(Date.now() / 1000) > payload.expiry) return null;
  return payload;
}
