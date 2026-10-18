// =============================================================================
// app/embed/checkout/page.tsx — iframe target for the drop-in SDK
// =============================================================================
// Served to merchant origins via the RobinPay embed script. Accepts a publicKey
// and renders a PayButton inside a constrained frame.
import { PayButton } from '@/components/checkout/PayButton';

export default async function EmbedCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ publicKey?: string; amount?: string; token?: string }>;
}) {
  const { publicKey, amount, token } = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 min-h-screen font-sans">
      <PayButton
        publicKey={publicKey ?? undefined}
        amount={amount ?? '0'}
        token={(token as 'USDC' | 'ETH') ?? 'ETH'}
      />
    </div>
  );
}
