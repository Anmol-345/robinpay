// =============================================================================
// components/checkout/TxStatus.tsx — Transaction status display
// =============================================================================
'use client';

interface TxStatusProps {
  status: 'idle' | 'pending' | 'paid' | 'failed';
  error?: string | null;
}

export function TxStatus({ status, error }: TxStatusProps) {
  const render = () => {
    switch (status) {
      case 'idle':
        return null;
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900 dark:border-white"></span>
            Waiting for on-chain confirmation…
          </div>
        );
      case 'paid':
        return (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-mono font-medium">
            ✅ Payment confirmed
          </div>
        );
      case 'failed':
        return (
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-mono font-medium">
              ❌ Payment failed
            </div>
            {error && (
              <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 p-2.5 rounded border border-red-200 dark:border-red-900/60 font-mono break-words leading-relaxed">
                {error}
              </div>
            )}
          </div>
        );
    }
  };

  return <>{render()}</>;
}
