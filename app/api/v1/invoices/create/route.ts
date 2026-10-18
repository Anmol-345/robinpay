// =============================================================================
// app/api/v1/invoices/create/route.ts
// =============================================================================
// Creates an invoice and returns a hosted payment link (/pay/[invoiceId]).
// Auth: sk_live_ / sk_test_
// Body: { amount, token, description?, externalRef?, escrow?, metadata?, expiresInMinutes?, successUrl?, cancelUrl? }
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { keccak256, toHex, parseUnits } from 'viem';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth/api-keys';
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
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
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

export async function POST(req: Request) {
  const auth = await authenticate(req, { requireSecret: true });
  if (!auth) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } }, { status: 400 });
  const b = parsed.data;

  const token = getToken(b.token);
  if (!token) return NextResponse.json({ error: { code: 'TOKEN_NOT_SUPPORTED', message: 'Token not supported' } }, { status: 400 });

  const amount = parseUnits(b.amount, token.decimals);

  if (b.escrow?.enabled) {
    const sum = (b.escrow.milestones ?? []).reduce((a, m) => a + parseUnits(m.amount, token.decimals), 0n);
    if (sum !== amount) {
      return NextResponse.json({ error: { code: 'MILESTONE_SUM', message: 'Milestones must equal total' } }, { status: 400 });
    }
  }

  const id = createId();
  const orderId = keccak256(toHex(auth.merchantId + ':' + id));
  const expiresAt = new Date(Date.now() + b.expiresInMinutes * 60_000);

  const invoice = await prisma.invoice.create({
    data: {
      id,
      orderId: orderId as string,
      merchantId: auth.merchantId,
      description: b.description,
      externalRef: b.externalRef,
      tokenAddress: token.address,
      tokenSymbol: b.token,
      tokenDecimals: token.decimals,
      amount: amount.toString(),
      escrowEnabled: !!b.escrow?.enabled,
      milestones: b.escrow?.milestones ? JSON.parse(JSON.stringify(b.escrow.milestones)) : undefined,
      metadata: b.metadata,
      successUrl: b.successUrl,
      cancelUrl: b.cancelUrl,
      status: 'UNPAID',
      expiresAt,
    },
  });

  return NextResponse.json(
    {
      id: invoice.id,
      url: env().NEXT_PUBLIC_APP_URL + '/pay/' + invoice.id,
      orderId,
      status: invoice.status,
      expiresAt,
    },
    { status: 201 },
  );
}
