// =============================================================================
// components/checkout/WalletModal.tsx — Wallet connection UI
// =============================================================================
'use client';

import * as React from 'react';
import { connectWallet, isWalletAvailable } from '@/lib/chain/wallet';
import { Button } from '@/components/ui/button';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

export function WalletModal({ open, onClose, onConnect }: WalletModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const { address } = await connectWallet();
      onConnect(address);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-1">Connect wallet</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Connect to Robinhood Chain Testnet (Chain ID 46630) to sign the payment.
        </p>

        {!isWalletAvailable() ? (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 text-center mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">No wallet detected</p>
            <a href="https://metamask.io/download" className="text-sm text-zinc-900 underline dark:text-zinc-100">Install MetaMask</a>
          </div>
        ) : (
          <>
            <Button variant="default" onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? 'Connecting...' : 'Connect & Sign'}
            </Button>
            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </>
        )}

        <Button variant="ghost" size="sm" onClick={onClose} className="w-full mt-3 text-zinc-500">
          Cancel
        </Button>
      </div>
    </div>
  );
}
