// =============================================================================
// app/api/v1/checkout/verify/route.ts
// =============================================================================
// Verifies a payment by transaction hash and fires merchant webhooks.
// Trusts the chain, not the client. Re-derives everything from the receipt.
// Auth: pk_ key with a checkout session token, or sk_ key.
// Body: { invoiceId: string, txHash: 0x... }
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isHex, type Hex } from 'viem';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth/api-keys';
import { validateCheckoutSession } from '@/lib/auth/session';
import { enqueueAndDispatch } from '@/lib/webhooks/dispatch';
import { verifyPayment } from '@/lib/payments/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  invoiceId: z.string().min(1),
  txHash: z.string().refine((v): v is Hex => isHex(v) && v.length === 66),
  sessionToken: z.string().optional(),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { invoiceId, txHash, sessionToken } = parsed.data;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.merchantId !== auth.merchantId) return fail('NOT_FOUND', 'Invoice not found', 404);
  if (invoice.status === 'PAID') return NextResponse.json({ status: 'PAID', invoiceId, txHash }); // idempotent
  if (invoice.status !== 'UNPAID') return fail('INVALID_STATE', 'Invoice is ' + invoice.status, 409);
  if (invoice.expiresAt && invoice.expiresAt < new Date()) return fail('EXPIRED', 'Invoice expired', 410);

  // pk_ calls must present a valid, unused checkout session bound to this invoice
  if (!auth.isSecret) {
    if (!sessionToken) return fail('BAD_REQUEST', 'sessionToken required for public key', 400);
    const session = await validateCheckoutSession(sessionToken);
    if (!session || session.invoiceId !== invoice.id || session.merchantId !== auth.merchantId) {
      return fail('INVALID_SESSION', 'Invalid or expired checkout session', 403);
    }
  }

  let verified;
  try {
    verified = await verifyPayment({
      txHash,
      orderId: invoice.orderId as `0x${string}`,
      merchantWallet: (
        await prisma.merchant.findUniqueOrThrow({ where: { id: invoice.merchantId } })
      ).walletAddress,
      tokenAddress: invoice.tokenAddress,
      minAmount: BigInt(invoice.amount.toFixed(0)),
    });
  } catch (err) {
    const msg = String(err);
    if (msg.startsWith('PENDING:')) {
      return NextResponse.json({ status: 'PENDING', invoiceId, txHash }, { status: 202 });
    }
    return fail(msg.split(':')[0], msg, 400);
  }

  const event = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { walletAddress: verified.payer.toLowerCase() },
      create: { walletAddress: verified.payer.toLowerCase() },
      update: {},
    });
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: customer.id,
        txHash: verified.txHash,
        logIndex: verified.logIndex,
        blockNumber: verified.blockNumber,
        payer: verified.payer.toLowerCase(),
        gross: verified.gross.toString(),
        fee: verified.fee.toString(),
        net: verified.net.toString(),
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date(), customerId: customer.id },
    });
    if (!auth.isSecret && sessionToken) {
      await tx.checkoutSession.update({
        where: { token: sessionToken },
        data: { usedAt: new Date() },
      });
    }
    return {
      type: 'payment.succeeded',
      merchantId: invoice.merchantId,
      data: {
        eventId: 'evt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24),
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        externalRef: invoice.externalRef,
        txHash: verified.txHash,
        amount: verified.gross.toString(),
        token: verified.token,
        payer: verified.payer,
      },
    };
  });

  // Fire-and-forget; failures are retried by /api/cron/retry-webhooks
  void enqueueAndDispatch(event);

  return NextResponse.json({ status: 'PAID', invoiceId, txHash });
}
