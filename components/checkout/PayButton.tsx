// =============================================================================
// components/checkout/PayButton.tsx — Drop-in checkout button
// =============================================================================
// Props:
//   publicKey   - merchant pk_ key (used to create a checkout session)
//   invoiceId   - invoice id to pay
//   amount      - amount in token base units (string)
//   token       - 'USDC' | 'ETH'
//   onSuccess   - called with { invoiceId, txHash } on verified payment
//   onError     - called with error message
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { WalletModal } from '@/components/checkout/WalletModal';
import { TxStatus } from '@/components/checkout/TxStatus';
import { connectWallet, signAndSendTx } from '@/lib/chain/wallet';
import { parseUnits } from 'viem';

interface PayButtonProps {
  publicKey?: string;
  invoiceId?: string;
  amount?: string;
  token?: 'USDC' | 'ETH';
  onSuccess?: (result: { invoiceId: string; txHash: string }) => void;
  onError?: (message: string) => void;
}

const TOKEN_DECIMALS: Record<string, number> = { USDC: 6, ETH: 18 };

export function PayButton({
  publicKey,
  invoiceId,
  amount,
  token = 'ETH',
  onSuccess,
  onError,
}: PayButtonProps) {
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'paid' | 'failed'>('idle');
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [buttonLoading, setButtonLoading] = React.useState(false);

  const handlePay = async () => {
    if (!invoiceId) {
      onError?.('INVOICE_REQUIRED: invoiceId is required');
      return;
    }
    setButtonLoading(true);
    try {
      // 1) Connect wallet
      const { address } = await connectWallet();
      setWalletAddress(address);
      setModalOpen(false);

      // 2) Build & send payment tx (native ETH path)
      setStatus('pending');
      const routerAddress = process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS as `0x${string}`;
      if (!routerAddress) throw new Error('ROUTER_NOT_CONFIGURED');
      const amountWei = parseUnits(amount ?? '0', TOKEN_DECIMALS[token] ?? 18);
      const hash = await signAndSendTx({ to: routerAddress, data: '0x', value: amountWei });

      // 3) Verify via server
      const verifyRes = await fetch('/api/v1/checkout/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicKey ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId, txHash: hash, sessionToken: '' }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error?.message || 'Verification failed');
      }
      const json = await verifyRes.json();
      if (json.status === 'PAID') {
        setStatus('paid');
        onSuccess?.({ invoiceId, txHash: hash });
      } else {
        setStatus('pending');
      }
    } catch (err) {
      setStatus('failed');
      const message = err instanceof Error ? err.message : String(err);
      onError?.(message);
    } finally {
      setButtonLoading(false);
    }
  };

  const disabled = status === 'pending' || status === 'paid' || buttonLoading;

  return (
    <>
      <Button variant="default" onClick={handlePay} disabled={disabled} className="w-full">
        {status === 'pending' ? (
          <>Paying… <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span></>
        ) : status === 'paid' ? (
          'Paid'
        ) : publicKey ? (
          'Connect Wallet & Pay'
        ) : (
          'Pay'
        )}
      </Button>
      <TxStatus status={status} />
      {walletAddress && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
          {walletAddress}
        </p>
      )}
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} onConnect={setWalletAddress} />
    </>
  );
}
