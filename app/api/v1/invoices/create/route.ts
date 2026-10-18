// =============================================================================
// app/api/v1/invoices/create/route.ts
// =============================================================================
// Creates a signed, stateless invoice token. PUBLIC endpoint — no API key.
// Identity comes from the merchant wallet address in the body.
// Body: { merchant, amount, token, description?, externalRef?, metadata?,
//         expiresInMinutes?, escrow?, signature?, webhookToken? }
// Returns { url, orderId, token, verified }. orderId = keccak256(token).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { keccak256, toHex, parseUnits, isAddress } from 'viem';
import { createInvoiceToken } from '@/lib/invoice/token';
import { verifyInvoiceSignature } from '@/lib/eip712';
import { getToken } from '@/lib/chain/tokens';
import { env } from '@/lib/env';
import { checkInvoiceRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_METADATA_BYTES = 2048;
const MAX_MILESTONES = 20;
const MAX_EXPIRY_MINUTES = 60 * 24 * 30; // 30 days

const Body = z.object({
  merchant: z.string().refine((v) => isAddress(v), 'Invalid merchant address'),
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  token: z.enum(['USDC', 'ETH']),
  description: z.string().max(280).optional(),
  externalRef: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  expiresInMinutes: z.number().int().min(5).max(MAX_EXPIRY_MINUTES).default(60 * 24),
  escrow: z
    .object({
      enabled: z.boolean(),
      milestones: z
        .array(
          z.object({
            title: z.string().max(100),
            amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
            releaseInDays: z.number().int().min(1).max(365),
          }),
        )
        .max(MAX_MILESTONES)
        .optional(),
    })
    .optional(),
  signature: z.string().refine((v) => v.startsWith('0x') && v.length === 132).optional(),
  webhookToken: z.string().optional(),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  // Rate limit by IP (+ merchant if provided after parse)
  const ip = getClientIp(req);
  const ipLimit = checkInvoiceRateLimit(ip);
  if (!ipLimit.allowed) {
    return fail(
      'RATE_LIMITED',
      `Too many invoice creation requests. Retry after ${ipLimit.retryAfter}s`,
      429,
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const b = parsed.data;

  // Rate limit per merchant
  const merchantLimit = checkInvoiceRateLimit(ip, b.merchant);
  if (!merchantLimit.allowed) {
    return fail(
      'RATE_LIMITED',
      `Too many invoice creation requests for this merchant. Retry after ${merchantLimit.retryAfter}s`,
      429,
    );
  }

  const token = getToken(b.token);
  if (!token) return fail('TOKEN_NOT_SUPPORTED', 'Token not supported', 400);

  const amount = parseUnits(b.amount, token.decimals);

  // Metadata size cap (2 KB)
  if (b.metadata) {
    const metadataBytes = new TextEncoder().encode(JSON.stringify(b.metadata)).length;
    if (metadataBytes > MAX_METADATA_BYTES) {
      return fail('METADATA_TOO_LARGE', `Metadata exceeds ${MAX_METADATA_BYTES} bytes`, 400);
    }
  }

  // Milestone sum check
  if (b.escrow?.enabled) {
    const milestones = b.escrow.milestones ?? [];
    const sum = milestones.reduce((a, m) => a + parseUnits(m.amount, token.decimals), 0n);
    if (sum !== amount) {
      return fail('MILESTONE_SUM', 'Milestones must equal total', 400);
    }
  }

  // Optional EIP-712 merchant signature verification
  let verified = false;
  if (b.signature) {
    const signer = await verifyInvoiceSignature({
      signature: b.signature as `0x${string}`,
      payload: {
        merchant: b.merchant as `0x${string}`,
        amount: amount.toString(),
        token: token.address as `0x${string}`,
        decimals: token.decimals,
        description: b.description ?? '',
        externalRef: b.externalRef ?? '',
        exp: Math.floor(Date.now() / 1000) + b.expiresInMinutes * 60,
        webhookToken: b.webhookToken ?? '',
      },
    });
    if (!signer) {
      return fail('INVALID_SIGNATURE', 'Invalid merchant signature', 401);
    }
    // Confirm the signer matches the claimed merchant
    if (signer.toLowerCase() !== b.merchant.toLowerCase()) {
      return fail('SIGNATURE_MERCHANT_MISMATCH', 'Signature merchant mismatch', 401);
    }
    verified = true;
  }

  const invoiceToken = createInvoiceToken({
    merchant: b.merchant.toLowerCase(),
    amount: amount.toString(),
    token: token.address,
    decimals: token.decimals,
    description: b.description,
    externalRef: b.externalRef,
    metadata: b.metadata,
    escrow: b.escrow?.enabled ? { milestones: b.escrow.milestones ?? [] } : undefined,
    webhookToken: b.webhookToken,
    verified,
    exp: Math.floor(Date.now() / 1000) + b.expiresInMinutes * 60,
  });

  const orderId = keccak256(toHex(invoiceToken)) as `0x${string}`;
  const url = env().NEXT_PUBLIC_APP_URL + '/pay/' + invoiceToken;

  return NextResponse.json({ url, orderId, token: invoiceToken, verified }, { status: 201 });
}
