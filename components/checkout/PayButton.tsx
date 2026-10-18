// =============================================================================
// components/checkout/PayButton.tsx — Drop-in checkout button (stateless)
// =============================================================================
// Props:
//   invoiceToken - signed stateless invoice token (inv_...)
//   amount       - amount in token base units (string)
//   token        - 'USDC' | 'ETH'
//   onSuccess    - called with { orderId, txHash } on verified payment
//   onError      - called with error message
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { WalletModal } from '@/components/checkout/WalletModal';
import { TxStatus } from '@/components/checkout/TxStatus';
import { connectWallet, signAndSendTx } from '@/lib/chain/wallet';
import { ROUTER_ABI } from '@/lib/chain/client';
import { Abi, encodeFunctionData, type Hex } from 'viem';
import { invoiceTokenToOrderId } from '@/lib/invoice/token';

interface PayButtonProps {
  invoiceToken: string;
  amount: string;
  token?: 'USDC' | 'ETH';
  onSuccess?: (result: { orderId: string; txHash: string }) => void;
  onError?: (message: string) => void;
}

export function PayButton({
  invoiceToken,
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
    setButtonLoading(true);
    try {
      // 1) Connect wallet
      const { address } = await connectWallet();
      setWalletAddress(address);
      setModalOpen(false);

      // 2) Build the router pay call. All values come from the signed token
      //    (never trusted from the client), except the token/amount already
      //    validated in the token.
      setStatus('pending');
      const routerAddress = process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS as `0x${string}`;
      if (!routerAddress) throw new Error('ROUTER_NOT_CONFIGURED');

      const orderId = invoiceTokenToOrderId(invoiceToken);
      const routerToken =
        token === 'ETH'
          ? '0x0000000000000000000000000000000000000000'
          : (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`);

      // Decode the merchant from the signed token (client cannot forge it).
      const payload = JSON.parse(
        Buffer.from(invoiceToken.split('_')[1].split('.')[0], 'base64url').toString('utf8'),
      ) as { merchant: `0x${string}` };

      const payData: Hex = encodeFunctionData({
        abi: ROUTER_ABI as unknown as Abi,
        functionName: 'pay',
        args: [orderId, payload.merchant, routerToken, BigInt(amount), '0x'],
      }) as Hex;

      const value = token === 'ETH' ? BigInt(amount) : undefined;
      const hash = await signAndSendTx({ to: routerAddress, data: payData, value });

      // 3) Verify via server (stateless; writes nothing)
      const verifyRes = await fetch('/api/v1/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invoiceToken, txHash: hash }),
      });

      if (!verifyRes.ok) {
        if (verifyRes.status === 202) {
          setStatus('pending');
          return;
        }
        const err = await verifyRes.json();
        throw new Error(err.error?.message || 'Verification failed');
      }

      const json = await verifyRes.json();
      if (json.status === 'PAID') {
        setStatus('paid');
        onSuccess?.({ orderId: json.orderId, txHash: hash });
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
        ) : (
          'Connect Wallet & Pay'
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
