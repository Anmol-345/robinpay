// =============================================================================
// app/api/v1/subscriptions/route.ts
// =============================================================================
// Subscription plan management. Plans live on-chain via SubscriptionVault; this
// endpoint is a thin stateless helper. PUBLIC endpoint — merchant address in
// body identifies the caller. No database writes.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { checkInvoiceRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function GET() {
  return NextResponse.json({
    plans: [],
    note: 'Plans and subscriptions are stored on-chain in SubscriptionVault. Query the contract directly.',
  });
}

const Body = z.object({
  merchant: z.string().refine((v) => isAddress(v), 'Invalid merchant address'),
  name: z.string().min(1).max(100),
  token: z.enum(['USDC', 'ETH']),
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  intervalSecs: z.number().int().min(60).max(60 * 60 * 24 * 365 * 10),
  trialSecs: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { merchant: merchantParam, ...rest } = parsed.data;

  const merchantLimit = checkInvoiceRateLimit(ip, merchantParam);
  if (!merchantLimit.allowed) {
    return fail(
      'RATE_LIMITED',
      `Too many subscription requests for this merchant. Retry after ${merchantLimit.retryAfter}s`,
      429,
    );
  }

  return NextResponse.json(
    {
      plan: {
        merchant: merchantParam.toLowerCase(),
        ...rest,
        note: 'Call createPlan on SubscriptionVault on-chain to register the plan.',
      },
    },
    { status: 201 },
  );
}
