// =============================================================================
// app/api/v1/invoices/create/route.ts
// =============================================================================
// Creates a signed, stateless invoice token. Nothing is written to a database.
// Auth: sk_ key.
// Body: { amount, token, description?, externalRef?, metadata?, expiresInMinutes?, escrow? }
// Returns { url, orderId, token }. orderId = keccak256(token).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { keccak256, toHex, parseUnits } from 'viem';
import { authenticate } from '@/lib/auth/stateless';
import { createInvoiceToken } from '@/lib/invoice/token';
import { getToken } from '@/lib/chain/tokens';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  token: z.enum(['USDC', 'ETH']),
  description: z.string().max(280).optional(),
  externalRef: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  expiresInMinutes: z.number().int().min(5).max(60 * 24 * 30).default(60 * 24),
  escrow: z
    .object({
      enabled: z.boolean(),
      milestones: z
        .array(
          z.object({ title: z.string(), amount: z.string(), releaseInDays: z.number().int().min(1) }),
        )
        .optional(),
    })
    .optional(),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const b = parsed.data;

  const token = getToken(b.token);
  if (!token) return fail('TOKEN_NOT_SUPPORTED', 'Token not supported', 400);

  const amount = parseUnits(b.amount, token.decimals);

  if (b.escrow?.enabled) {
    const sum = (b.escrow.milestones ?? []).reduce((a, m) => a + parseUnits(m.amount, token.decimals), 0n);
    if (sum !== amount) {
      return fail('MILESTONE_SUM', 'Milestones must equal total', 400);
    }
  }

  const invoiceToken = createInvoiceToken({
    merchant: auth.merchant,
    amount: amount.toString(),
    token: token.address,
    decimals: token.decimals,
    description: b.description,
    externalRef: b.externalRef,
    metadata: b.metadata,
    escrow: b.escrow?.enabled
      ? { milestones: b.escrow.milestones ?? [] }
      : undefined,
    exp: Math.floor(Date.now() / 1000) + b.expiresInMinutes * 60,
  });

  const orderId = keccak256(toHex(invoiceToken)) as `0x${string}`;
  const url = env().NEXT_PUBLIC_APP_URL + '/pay/' + invoiceToken;

  return NextResponse.json({ url, orderId, token: invoiceToken }, { status: 201 });
}
