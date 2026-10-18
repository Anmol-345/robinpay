// =============================================================================
// app/api/v1/checkout/verify/route.ts
// =============================================================================
// Verifies a payment by transaction hash. Derives everything from the receipt
// and the signed invoice token; writes nothing to any database.
// Auth: optional sk_ key. When present, fires the merchant webhook inline.
// Body: { token (signed invoice token), txHash }
// Returns { status: 'PAID' | 'PENDING', txHash, orderId }
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isHex, type Hex } from 'viem';
import { authenticate } from '@/lib/auth/stateless';
import { parseInvoiceToken, invoiceTokenToOrderId } from '@/lib/invoice/token';
import { verifyPaymentTx } from '@/lib/payments/status';
import { sendWebhook } from '@/lib/webhooks/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  token: z.string().min(1),
  txHash: z.string().refine((v): v is Hex => isHex(v) && v.length === 66),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  // Optional sk_ auth for server-side verification + webhook firing.
  let auth: { merchant: string; webhookUrl?: string } | null = null;
  const header = req.headers.get('authorization') ?? '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (bearerToken) {
    const result = await authenticate(req);
    if (result) auth = { merchant: result.merchant, webhookUrl: result.webhookUrl };
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { token: invoiceToken, txHash } = parsed.data;

  const invoice = parseInvoiceToken(invoiceToken);
  if (!invoice) return fail('INVALID_TOKEN', 'Invalid or expired invoice token', 400);

  const orderId = invoiceTokenToOrderId(invoiceToken);

  let verified;
  try {
    verified = await verifyPaymentTx({
      txHash,
      orderId,
      merchantWallet: invoice.merchant,
      tokenAddress: invoice.token,
      minAmount: BigInt(invoice.amount),
    });
  } catch (err) {
    const msg = String(err);
    if (msg.startsWith('PENDING:')) {
      return NextResponse.json({ status: 'PENDING', txHash, orderId }, { status: 202 });
    }
    return fail(msg.split(':')[0], msg, 400);
  }

  // Fire the webhook inline when server-side auth is available.
  if (auth?.webhookUrl) {
    void sendWebhook({
      merchant: invoice.merchant,
      url: auth.webhookUrl,
      event: {
        type: 'payment.succeeded',
        merchant: invoice.merchant,
        data: {
          eventId: 'evt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24),
          orderId,
          externalRef: invoice.externalRef,
          txHash,
          amount: verified.gross.toString(),
          token: verified.token,
          payer: verified.payer,
        },
      },
    });
  }

  return NextResponse.json({ status: 'PAID', txHash, orderId });
}
