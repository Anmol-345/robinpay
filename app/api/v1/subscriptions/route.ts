// =============================================================================
// app/api/v1/subscriptions/route.ts
// =============================================================================
// Subscription plan management stubs. Full plan creation lives on-chain via the
// SubscriptionVault; these endpoints mirror plans/subscriptions into the DB.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth/api-keys';
import { parseUnits } from 'viem';
import { getToken } from '@/lib/chain/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get('merchantId') || auth.merchantId;

  const plans = await prisma.plan.findMany({ where: { merchantId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ plans });
}

const Body = z.object({
  name: z.string().min(1).max(100),
  token: z.enum(['USDC', 'ETH']),
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  intervalSecs: z.number().int().min(60).max(60 * 60 * 24 * 365 * 10),
  trialSecs: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const auth = await authenticate(req, { requireSecret: true });
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const b = parsed.data;

  const token = getToken(b.token);
  if (!token) return fail('TOKEN_NOT_SUPPORTED', 'Token not supported', 400);

  const amount = parseUnits(b.amount, token.decimals);

  // onchainPlanId assigned after the merchant calls createPlan on-chain
  const plan = await prisma.plan.create({
    data: {
      merchantId: auth.merchantId,
      onchainPlanId: '0',
      name: b.name,
      tokenAddress: token.address,
      amount: amount.toString(),
      intervalSecs: b.intervalSecs,
      trialSecs: b.trialSecs,
      isActive: true,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
