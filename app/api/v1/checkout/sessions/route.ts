// =============================================================================
// app/api/v1/checkout/sessions/route.ts
// =============================================================================
// Creates a short-lived checkout session bound to an invoice.
// Browser-safe: called with a pk_ key. Returns a session token the frontend
// passes to /api/v1/checkout/verify.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth/api-keys';
import { createCheckoutSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  invoiceId: z.string().min(1),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth || auth.isSecret) return fail('UNAUTHORIZED', 'Use a public (pk_) key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { invoiceId } = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, merchantId: true, status: true, expiresAt: true },
  });
  if (!invoice || invoice.merchantId !== auth.merchantId) return fail('NOT_FOUND', 'Invoice not found', 404);
  if (invoice.status !== 'UNPAID') return fail('INVALID_STATE', 'Invoice is ' + invoice.status, 409);
  if (invoice.expiresAt && invoice.expiresAt < new Date()) return fail('EXPIRED', 'Invoice expired', 410);

  const origin = req.headers.get('origin') ?? undefined;
  const { token, expiresAt } = await createCheckoutSession({
    merchantId: auth.merchantId,
    invoiceId,
    origin: origin ?? 'https://localhost:3000',
  });

  return NextResponse.json({ token, expiresAt }, { status: 201 });
}
