// =============================================================================
// app/api/v1/subscriptions/route.ts
// =============================================================================
// Subscription plan management. Plans live on-chain via SubscriptionVault; this
// endpoint is a thin stateless helper. No database writes.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate } from '@/lib/auth/stateless';

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
  name: z.string().min(1).max(100),
  token: z.enum(['USDC', 'ETH']),
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  intervalSecs: z.number().int().min(60).max(60 * 60 * 24 * 365 * 10),
  trialSecs: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const b = parsed.data;

  return NextResponse.json(
    {
      plan: {
        merchant: auth.merchant,
        name: b.name,
        token: b.token,
        amount: b.amount,
        intervalSecs: b.intervalSecs,
        trialSecs: b.trialSecs,
        note: 'Call createPlan on SubscriptionVault on-chain to register the plan.',
      },
    },
    { status: 201 },
  );
}
