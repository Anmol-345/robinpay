// =============================================================================
// app/embed/checkout/page.tsx — iframe target for the drop-in SDK (stateless)
// =============================================================================
// Served to merchant origins via the RobinPay embed script. Accepts an invoice
// token and renders a PayButton inside a constrained frame.
import { PayButton } from '@/components/checkout/PayButton';

export default async function EmbedCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; amount?: string; tokenSymbol?: string }>;
}) {
  const { token, amount, tokenSymbol } = await searchParams;

  if (!token) {
    return <div className="p-4 text-red-600">Missing invoice token</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 min-h-screen font-sans">
      <PayButton
        invoiceToken={token}
        amount={amount ?? '0'}
        token={(tokenSymbol as 'USDC' | 'ETH') ?? 'ETH'}
      />
    </div>
  );
}
