// =============================================================================
// components/checkout/TxStatus.tsx — Transaction status display
// =============================================================================
'use client';

interface TxStatusProps {
  status: 'idle' | 'pending' | 'paid' | 'failed';
}

export function TxStatus({ status }: TxStatusProps) {
  const render = () => {
    switch (status) {
      case 'idle':
        return null;
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900 dark:border-white"></span>
            Waiting for confirmation…
          </div>
        );
      case 'paid':
        return (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            ✅ Payment confirmed
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
            ❌ Payment failed
          </div>
        );
    }
  };

  return <>{render()}</>;
}
