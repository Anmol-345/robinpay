'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { connectWallet, getWalletClient, isWalletAvailable } from '@/lib/chain/wallet';
import { Wallet, Sparkles, X, AlertCircle, ArrowRight, CheckCircle2, Shield } from 'lucide-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<'idle' | 'connecting' | 'signing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleBrowserWallet = async () => {
    setStatus('connecting');
    setErrorMessage(null);

    try {
      if (!isWalletAvailable()) {
        setStatus('error');
        setErrorMessage('No Ethereum wallet extension (e.g. MetaMask) detected in your browser.');
        return;
      }

      const { address: addr } = await connectWallet();

      setStatus('signing');
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!sessionRes.ok) throw new Error('Failed to get SIWE authorization nonce');
      const sessionData = await sessionRes.json();

      const message = sessionData.message.replace("address: '0x'", `address: '${addr}'`);

      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client could not be initialized');

      const signature = await walletClient.signMessage({
        message,
        account: addr as `0x${string}`,
      });

      const loginRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!loginRes.ok) {
        const err = await loginRes.json();
        throw new Error(err.error?.message || 'SIWE authentication failed');
      }

      setStatus('success');
      setTimeout(() => {
        onClose();
        router.push('/dashboard');
      }, 700);
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User rejected') || msg.includes('4001')) {
        setErrorMessage('Signature or connection request was cancelled in your wallet.');
      } else {
        setErrorMessage(msg);
      }
    }
  };

  const handleDemoWallet = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });
      if (!res.ok) throw new Error('Could not establish demo merchant session');
      await res.json();
      setStatus('success');
      setTimeout(() => {
        onClose();
        router.push('/dashboard');
      }, 500);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Demo session initialization failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-mono">
      {/* Sketched Modal Window */}
      <div className="relative w-full max-w-md bg-[#FAFAFA] border-2 border-[#0A0A0A] p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A] -rotate-0.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#0A0A0A] mb-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] bg-transparent inline-block"></span>
            <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] bg-transparent inline-block"></span>
            <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] bg-transparent inline-block"></span>
          </div>
          <span className="font-caveat text-2xl text-[#0A0A0A]">Connect Merchant Wallet</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#0A0A0A]/10 rounded transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-[#0A0A0A]" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-[#525252] mb-6 leading-relaxed">
          Sign-In with Ethereum (SIWE) on Robinhood Chain to manage your API keys, invoices, and webhooks.
        </p>

        {/* Error Alert */}
        {status === 'error' && errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-sm text-xs text-red-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
              {errorMessage.includes('No Ethereum wallet') && (
                <a
                  href="https://metamask.io/download"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 underline font-bold"
                >
                  Download MetaMask &rarr;
                </a>
              )}
            </div>
          </div>
        )}

        {/* Active Status Banner */}
        {status === 'connecting' && (
          <div className="mb-4 p-3 bg-white border-2 border-[#0A0A0A] rounded-sm text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A] animate-ping" />
            <span>Connecting to wallet provider...</span>
          </div>
        )}

        {status === 'signing' && (
          <div className="mb-4 p-3 bg-white border-2 border-[#0A0A0A] rounded-sm text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0A0A0A] animate-pulse" />
            <span>Please approve SIWE signature in your wallet...</span>
          </div>
        )}

        {status === 'success' && (
          <div className="mb-4 p-3 bg-white border-2 border-[#0A0A0A] rounded-sm text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span className="font-semibold text-emerald-700">Wallet authenticated! Redirecting to Dashboard...</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Option 1: Browser Wallet */}
          <button
            onClick={handleBrowserWallet}
            disabled={status === 'connecting' || status === 'signing' || status === 'success'}
            className="sketch-btn sketch-border w-full py-3 px-4 bg-[#0A0A0A] text-white border-2 border-[#0A0A0A] flex items-center justify-between font-mono text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="w-5 h-5 text-white" />
              <span>Browser Wallet (MetaMask / Web3)</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>

          {/* Option 2: Demo Test Merchant Wallet */}
          <button
            onClick={handleDemoWallet}
            disabled={status === 'connecting' || status === 'signing' || status === 'success'}
            className="sketch-btn sketch-border-alt w-full py-3 px-4 bg-white text-[#0A0A0A] border-2 border-[#0A0A0A] flex items-center justify-between font-mono text-sm font-semibold cursor-pointer hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
              <span>Demo Merchant Wallet (Instant Access)</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#0A0A0A]" />
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-3 border-t border-dashed border-[#0A0A0A]/40 flex items-center justify-between text-[11px] text-[#525252]">
          <span>Chain ID: 4663 (Robinhood Chain)</span>
          <span>Zero Custody</span>
        </div>
      </div>
    </div>
  );
}
