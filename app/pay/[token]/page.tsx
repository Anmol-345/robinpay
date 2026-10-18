// =============================================================================
// app/pay/[token]/page.tsx — Public payment page (stateless)
// =============================================================================
// RSC page that decodes the signed invoice token and renders the PayButton.
// Payment status is derived from the chain; nothing is read from a database.
import { PayButton } from '@/components/checkout/PayButton';
import { parseInvoiceToken } from '@/lib/invoice/token';
import { isOrderPaid } from '@/lib/payments/status';
import { keccak256, toHex } from 'viem';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = parseInvoiceToken(token);
  return {
    title: invoice ? `Pay ${invoice.amount} ${invoice.decimals === 0 ? 'ETH' : 'USDC'} • RobinPay` : 'Payment • RobinPay',
    description: invoice?.description ?? 'Secure on-chain payment',
  };
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = parseInvoiceToken(token);

  if (!invoice) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 text-zinc-900 dark:text-zinc-100">
        <h1 className="text-2xl font-bold mb-2">Invalid payment link</h1>
        <p className="text-zinc-500 dark:text-zinc-400">The invoice token is invalid or has expired.</p>
      </div>
    );
  }

  let paid = false;
  try {
    const orderId = keccak256(toHex(token));
    paid = await isOrderPaid(orderId as `0x${string}`);
  } catch {
    paid = false;
  }

  if (paid) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 text-zinc-900 dark:text-zinc-100">
        <h1 className="text-2xl font-bold mb-2 text-emerald-600 dark:text-emerald-400">✅ Payment confirmed</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Thank you. Your order is paid on-chain.</p>
      </div>
    );
  }

  const displayAmount =
    invoice.decimals === 0
      ? invoice.amount
      : (Number(invoice.amount) / 10 ** invoice.decimals).toFixed(2);
  const tokenSymbol = invoice.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC';

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
            {displayAmount} {tokenSymbol}
          </div>
        </div>

        <PayButton
          invoiceToken={token}
          amount={invoice.amount}
          token={(tokenSymbol as 'USDC' | 'ETH')}
        />
      </div>
    </div>
  );
}
