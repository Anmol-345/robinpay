// =============================================================================
// app/pay/[invoiceId]/page.tsx — Public payment page (RSC + client wallet UI)
// =============================================================================
// Server component renders the invoice; the PayButton client component handles
// wallet connection, signing, and verification.
import { PayButton } from '@/components/checkout/PayButton';
import { prisma } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  return {
    title: invoice ? `Pay ${invoice.amount} ${invoice.tokenSymbol} • RobinPay` : 'Payment • RobinPay',
    description: invoice?.description ?? 'Secure on-chain payment',
  };
}

export default async function PayPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    return (
      <div className="min-h-flex flex-col items-center justify-center py-20 text-zinc-900 dark:text-zinc-100">
        <h1 className="text-2xl font-bold mb-2">Invoice not found</h1>
        <p className="text-zinc-500 dark:text-zinc-400">The payment link is invalid or has expired.</p>
      </div>
    );
  }

  if (invoice.status === 'PAID') {
    return (
      <div className="min-h-flex flex-col items-center justify-center py-20 text-zinc-900 dark:text-zinc-100">
        <h1 className="text-2xl font-bold mb-2 text-emerald-600 dark:text-emerald-400">✅ Payment confirmed</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Thank you. Your order is paid.</p>
      </div>
    );
  }

  const amountStr = invoice.amount.toString();
  const displayAmount =
    invoice.tokenDecimals === 0
      ? amountStr
      : (Number(amountStr) / 10 ** invoice.tokenDecimals).toFixed(2);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full border rounded-xl p-8 shadow-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <div className="mb-6 flex items-center gap-2">
          <span className="font-bold text-black dark:text-white">RobinPay</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">• Robinhood Chain</span>
        </div>

        <h2 className="text-xl font-bold mb-1">{invoice.description || 'Invoice'}</h2>
        {invoice.externalRef && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Order: {invoice.externalRef}</p>
        )}

        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Amount</div>
          <div className="text-3xl font-bold text-black dark:text-white">
            {displayAmount} {invoice.tokenSymbol}
          </div>
        </div>

        <PayButton
          invoiceId={invoice.id}
          amount={amountStr}
          token={(invoice.tokenSymbol as 'USDC' | 'ETH') ?? 'ETH'}
        />
      </div>
    </div>
  );
}
