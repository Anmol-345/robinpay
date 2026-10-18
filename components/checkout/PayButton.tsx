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
import { Abi, encodeFunctionData, parseAbi, type Hex } from 'viem';
import { invoiceTokenToOrderId } from '@/lib/invoice/token';
import { CheckCircle2, ExternalLink } from 'lucide-react';

interface PayButtonProps {
  invoiceToken: string;
  amount: string;
  token?: 'USDC' | 'ETH';
  merchant?: string;
  onSuccess?: (result: { orderId: string; txHash: string }) => void;
  onError?: (message: string) => void;
}

function decodeBase64Url(base64UrlStr: string): string {
  try {
    const base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    if (typeof atob !== 'undefined') {
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

export function PayButton({
  invoiceToken,
  amount,
  token = 'ETH',
  merchant,
  onSuccess,
  onError,
}: PayButtonProps) {
  const [status, setStatus] = React.useState<'idle' | 'pending' | 'paid' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [buttonLoading, setButtonLoading] = React.useState(false);
  const [lastTxHash, setLastTxHash] = React.useState<string | null>(null);

  const explorerBaseUrl =
    process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL &&
    !process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL.includes('.example')
      ? process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL
      : 'https://robinhoodchain.blockscout.com';

  const handlePay = async () => {
    setButtonLoading(true);
    setErrorMessage(null);
    try {
      // 1) Connect wallet and ensure on Robinhood Chain Testnet (4663)
      const { address } = await connectWallet({ requireChain: true });
      setWalletAddress(address);
      setModalOpen(false);

      // 2) Build the pay transaction for Robinhood Chain Testnet
      setStatus('pending');
      const orderId = invoiceTokenToOrderId(invoiceToken);

      const testnetUsdcAddress =
        (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) ||
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

      const routerAddress = process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS as `0x${string}`;
      const isRouterDeployed =
        routerAddress &&
        routerAddress !== '0x0000000000000000000000000000000000000000';

      // Resolve the merchant destination address safely in browser
      let merchantAddress = merchant as `0x${string}` | undefined;
      if (!merchantAddress && invoiceToken.includes('_')) {
        try {
          const rawB64 = invoiceToken.split('_')[1].split('.')[0];
          const decodedJson = decodeBase64Url(rawB64);
          if (decodedJson) {
            const payload = JSON.parse(decodedJson) as { merchant: `0x${string}` };
            merchantAddress = payload.merchant;
          }
        } catch {
          // Handled below if unresolved
        }
      }

      if (!merchantAddress) {
        throw new Error('Could not resolve destination merchant address from invoice.');
      }

      let hash: `0x${string}`;

      if (isRouterDeployed) {
        // Router settlement flow
        const routerToken =
          token === 'ETH'
            ? '0x0000000000000000000000000000000000000000'
            : testnetUsdcAddress;

        // If paying with ERC-20 USDC, approve router first if needed
        if (token === 'USDC') {
          const approveData: Hex = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [routerAddress, BigInt(amount)],
          });
          await signAndSendTx({ to: testnetUsdcAddress, data: approveData });
        }

        const payData: Hex = encodeFunctionData({
          abi: ROUTER_ABI as unknown as Abi,
          functionName: 'pay',
          args: [orderId, merchantAddress, routerToken, BigInt(amount), '0x'],
        }) as Hex;

        const value = token === 'ETH' ? BigInt(amount) : undefined;
        hash = await signAndSendTx({ to: routerAddress, data: payData, value });
      } else {
        // Direct testnet settlement on Robinhood Chain Testnet
        if (token === 'ETH') {
          // Native testnet ETH transfer (Arbitrum Orbit rollups prohibit calldata on EOA transfers)
          hash = await signAndSendTx({
            to: merchantAddress,
            value: BigInt(amount),
          });
        } else {
          // Testnet USDC token transfer
          const transferData: Hex = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [merchantAddress, BigInt(amount)],
          });
          hash = await signAndSendTx({
            to: testnetUsdcAddress,
            data: transferData,
          });
        }
      }

      setLastTxHash(hash);

      // 3) Verify on-chain via server
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
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `robinpay_events_${merchantAddress.toLowerCase()}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const newEv = {
              type: 'PaymentProcessed',
              blockNumber: 'Testnet (46630)',
              txHash: hash,
              args: {
                orderId: json.orderId,
                payer: walletAddress || 'Payer',
                merchant: merchantAddress,
                amount: `${amount} ${token}`,
                token,
                timestamp: new Date().toISOString(),
              },
            };
            if (!existing.some((e: { txHash?: string }) => e.txHash?.toLowerCase() === hash.toLowerCase())) {
              existing.unshift(newEv);
              localStorage.setItem(storageKey, JSON.stringify(existing));
              window.dispatchEvent(new CustomEvent('robinpay_payment_recorded', { detail: newEv }));
            }
          } catch {
            // Ignore storage errors
          }
        }

        if (typeof window !== 'undefined' && window.opener) {
          try {
            window.opener.postMessage({
              type: 'ROBINPAY_PAYMENT_SUCCESS',
              orderId: json.orderId,
              txHash: hash,
            }, '*');
          } catch {
            // Ignore cross-origin postMessage errors
          }
        }
        onSuccess?.({ orderId: json.orderId, txHash: hash });
      } else {
        setStatus('pending');
      }
    } catch (err) {
      setStatus('failed');
      const rawMessage = err instanceof Error ? err.message : String(err);
      let friendly = rawMessage;

      if (rawMessage.includes('User rejected') || rawMessage.includes('user rejected') || rawMessage.includes('User denied') || rawMessage.includes('rejected the request')) {
        friendly = 'Transaction cancelled in your wallet.';
      } else if (rawMessage.includes('exceeds balance') || rawMessage.includes('insufficient funds') || rawMessage.includes('transfer amount exceeds balance')) {
        friendly = `Insufficient ${token} or gas balance in your wallet on Robinhood Chain. Please check your wallet or use 'Testnet Tools' below.`;
      } else if (rawMessage.includes('WRONG_CHAIN')) {
        friendly = 'Please approve network switch in your wallet to Robinhood Chain (Chain ID 4663).';
      } else if (rawMessage.includes('revert') || rawMessage.includes('execution reverted')) {
        friendly = `Transaction reverted: check that your wallet has enough ${token} balance on Robinhood Chain.`;
      }

      setErrorMessage(friendly);
      onError?.(friendly);
    } finally {
      setButtonLoading(false);
    }
  };

  const disabled = status === 'pending' || status === 'paid' || buttonLoading;

  return (
    <>
      <Button
        variant="default"
        onClick={handlePay}
        disabled={disabled}
        className={
          status === 'paid'
            ? 'sketch-btn sketch-border w-full py-3 bg-emerald-600 text-white font-mono font-bold cursor-default disabled:opacity-100 opacity-100 shadow-sm'
            : 'sketch-btn sketch-border w-full py-3 bg-[#0A0A0A] text-white hover:bg-black font-mono font-semibold cursor-pointer disabled:opacity-50'
        }
      >
        {status === 'pending' ? (
          <span className="flex items-center justify-center gap-2">
            <span>Confirming on Robinhood Testnet…</span>
            <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
          </span>
        ) : status === 'paid' ? (
          <span className="flex items-center justify-center gap-2 text-white">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Paid on Robinhood Testnet</span>
          </span>
        ) : status === 'failed' ? (
          <span className="flex items-center justify-center gap-2">
            <span>Retry Payment in Testnet {token}</span>
          </span>
        ) : (
          `Connect Wallet & Pay in Testnet ${token}`
        )}
      </Button>

      {lastTxHash && status === 'paid' && (
        <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-mono flex items-center justify-between text-emerald-900 dark:text-emerald-200">
          <span className="truncate max-w-[220px]">Tx: {lastTxHash}</span>
          <a
            href={`${explorerBaseUrl}/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-bold underline hover:opacity-80"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <TxStatus status={status} error={errorMessage} />
      {walletAddress && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-xs">
          Payer: {walletAddress}
        </p>
      )}
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} onConnect={setWalletAddress} />
    </>
  );
}
