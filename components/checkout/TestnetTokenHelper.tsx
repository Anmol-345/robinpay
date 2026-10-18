// =============================================================================
// components/checkout/TestnetTokenHelper.tsx — Testnet helper for payment page
// =============================================================================
'use client';

import * as React from 'react';
import { addTestnetTokenToWallet, switchToRobinhoodChain } from '@/lib/chain/wallet';
import { Coins, Droplet, PlusCircle, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface TestnetTokenHelperProps {
  tokenSymbol: 'USDC' | 'ETH';
}

export function TestnetTokenHelper({ tokenSymbol }: TestnetTokenHelperProps) {
  const [open, setOpen] = React.useState(false);
  const [faucetStatus, setFaucetStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [faucetMsg, setFaucetMsg] = React.useState<string | null>(null);
  const [recipient, setRecipient] = React.useState('');

  const handleAddToken = async () => {
    try {
      await addTestnetTokenToWallet({
        symbol: 'USDC',
        decimals: 6,
      });
    } catch (err: unknown) {
      console.warn('Could not add token:', err);
    }
  };

  const handleSwitchChain = async () => {
    try {
      await switchToRobinhoodChain();
    } catch (err: unknown) {
      console.warn('Could not switch chain:', err);
    }
  };

  const handleClaim = async () => {
    if (!recipient.trim()) {
      setFaucetStatus('error');
      setFaucetMsg('Please enter your wallet address');
      return;
    }
    setFaucetStatus('loading');
    setFaucetMsg(null);
    try {
      const res = await fetch('/api/testnet/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: recipient.trim(),
          token: tokenSymbol,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Faucet claim failed');
      setFaucetStatus('success');
      setFaucetMsg(`Sent ${data.amount} ${tokenSymbol} to your wallet!`);
    } catch (err: unknown) {
      setFaucetStatus('error');
      setFaucetMsg(err instanceof Error ? err.message : 'Faucet request failed');
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-xs font-mono">
      <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          <span>Need Robinhood Chain testnet tokens?</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="underline font-bold text-black dark:text-white cursor-pointer hover:opacity-80"
        >
          {open ? 'Hide' : 'Testnet Tools'}
        </button>
      </div>

      {open && (
        <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded border border-zinc-200 dark:border-zinc-700 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddToken}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Add Testnet USDC to Wallet</span>
            </button>

            <button
              type="button"
              onClick={handleSwitchChain}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Switch to Robinhood Testnet</span>
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
              Instant Faucet Drip ({tokenSymbol})
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter 0x... address"
                className="flex-1 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={handleClaim}
                disabled={faucetStatus === 'loading'}
                className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {faucetStatus === 'loading' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Droplet className="w-3 h-3 text-blue-400" />
                )}
                <span>Get {tokenSymbol}</span>
              </button>
            </div>

            {faucetMsg && (
              <p
                className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                  faucetStatus === 'success' ? 'text-emerald-600 font-semibold' : 'text-red-600'
                }`}
              >
                {faucetStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{faucetMsg}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
