// =============================================================================
// app/api/v1/webhooks/register/route.ts
// =============================================================================
// Merchant registers a webhook by signing an EIP-712 message
// { merchant, url, events, expiry } with their wallet.
// Returns a signed, stateless webhook config token (whc_...) that the merchant
// passes in the SDK/invoice create call as 'webhookToken'. No registry needed.
// SSRF protected: https only, blocks private/loopback/link-local IPs, no
// redirects, response size capped.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { verifyWebhookConfigSignature, createWebhookConfigToken } from '@/lib/eip712';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EVENTS_LENGTH = 200;
const DEFAULT_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

// SSRF protection: check that URL is HTTPS and not pointing to private/loopback/link-local.
function isSsrSafeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Only HTTPS allowed.
  if (parsed.protocol !== 'https:') return false;

  // No redirects — Next.js fetch follows redirects by default; we check the
  // initial URL here and the fetch call uses redirect: 'manual' when calling.

  const host = parsed.hostname.toLowerCase();

  // Block loopback.
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;

  // Block link-local (169.254.x.x).
  if (host.startsWith('169.254.')) return false;

  // Block private ranges (RFC 1918): 10.x.x.x, 172.16-31.x.x, 192.168.x.x.
  if (host.startsWith('10.')) return false;
  if (host.startsWith('172.')) {
    const second = parseInt(host.split('.')[1] || '0', 10);
    if (second >= 16 && second <= 31) return false;
  }
  if (host.startsWith('192.168.')) return false;

  // Block link-local IPv6 (fe80::).
  if (host.startsWith('fe80:')) return false;

  // Block unique local IPv6 (fc00::/7).
  if (host.startsWith('fc00:') || host.startsWith('fd')) return false;

  return true;
}

const Body = z.object({
  merchant: z.string().refine((v) => isAddress(v), 'Invalid merchant address'),
  url: z.string().url().refine((v) => isSsrSafeUrl(v), 'Webhook URL must be HTTPS and not point to a private address'),
  events: z.string().max(MAX_EVENTS_LENGTH),
  signature: z.string().refine((v) => v.startsWith('0x') && v.length === 132),
  expiry: z.number().int().min(60).max(DEFAULT_EXPIRY_SECONDS).default(DEFAULT_EXPIRY_SECONDS),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { merchant, url, events, signature, expiry } = parsed.data;

  // Verify the EIP-712 signature.
  const signer = await verifyWebhookConfigSignature({
    signature: signature as `0x${string}`,
    payload: {
      merchant: merchant as `0x${string}`,
      url,
      events,
      expiry: Math.floor(Date.now() / 1000) + expiry,
    },
  });

  if (!signer) {
    return fail('INVALID_SIGNATURE', 'Invalid merchant signature', 401);
  }

  // Confirm signer matches claimed merchant.
  if (signer.toLowerCase() !== merchant.toLowerCase()) {
    return fail('SIGNATURE_MERCHANT_MISMATCH', 'Signature merchant mismatch', 401);
  }

  // Create stateless webhook config token.
  const token = createWebhookConfigToken({
    merchant: merchant.toLowerCase(),
    url,
    events: events.split(',').map((e) => e.trim()).filter(Boolean),
    expiry: Math.floor(Date.now() / 1000) + expiry,
  });

  return NextResponse.json({
    token,
    merchant: merchant.toLowerCase(),
    url,
    events,
    expiresAt: new Date(Date.now() + expiry * 1000).toISOString(),
  });
}
