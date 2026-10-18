// =============================================================================
// components/auth/SIWELogin.tsx — SIWE login: connect wallet, sign, get session
// =============================================================================
// Flow:
// 1. Connect wallet (window.ethereum via viem custom transport)
// 2. GET /api/auth/session for nonce/domain/chainId
// 3. Build SIWE message with connected address
// 4. Sign message with wallet
// 5. POST /api/auth/session with message + signature → httpOnly session cookie
// 6. Redirect to dashboard on success
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { connectWallet, getWalletClient } from '@/lib/chain/wallet';

interface SIWELoginProps {
  onSuccess?: () => void;
  className?: string;
}

export function SIWELogin({ onSuccess, className }: SIWELoginProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<'idle' | 'connecting' | 'signing' | 'authenticated' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [address, setAddress] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      setStatus('connecting');
      const { address: addr } = await connectWallet();
      setAddress(addr);

      setStatus('signing');
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!sessionRes.ok) throw new Error('Failed to get SIWE nonce');
      const session = await sessionRes.json();

      const message = session.message.replace("address: '0x'", `address: '${addr}'`);

      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client not available');
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
        throw new Error(err.error?.message || 'Login failed');
      }

      setStatus('authenticated');
      onSuccess?.();
      router.push('/dashboard');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setStatus('idle');
    setAddress(null);
    setError(null);
    router.push('/');
  };

  const isConnected = status === 'authenticated' || status === 'connecting' || status === 'signing';

  return (
    <div className={cn('max-w-md w-full mx-auto', className ?? '')}>
      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 font-mono">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline underline-offset-4 hover:text-red-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {status === 'authenticated' ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-700 font-bold">✓</span>
          </div>
          <h3 className="font-mono text-lg text-[#0A0A0A] mb-1">Connected</h3>
          <p className="font-mono text-xs text-[#525252] mb-4 break-all">{address}</p>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            Disconnect
          </Button>
        </div>
      ) : (
        <>
          <Button
            variant="default"
            onClick={handleLogin}
            disabled={status === 'connecting' || status === 'signing'}
            className={cn(
              'w-full',
              status === 'connecting' || status === 'signing' ? 'opacity-50' : ''
            )}
          >
            {status === 'connecting'
              ? 'Connecting wallet…'
              : status === 'signing'
                ? 'Signing with wallet…'
                : 'Connect wallet & sign in'}
          </Button>
          {isConnected && address && (
            <p className="mt-2 text-xs text-[#525252] font-mono break-all">{address}</p>
          )}
        </>
      )}
    </div>
  );
}
