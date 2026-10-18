// =============================================================================
// components/dashboard/VerifySignature.tsx — Verify EIP-712 invoice signature
// =============================================================================
// Tool for merchants to test EIP-712 invoice signing. Connects wallet, signs
// an invoice payload, and shows whether the signature is valid.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { connectWallet, getWalletClient } from '@/lib/chain/wallet';
import { recoverTypedDataAddress } from 'viem';

export function VerifySignature() {
  const [status, setStatus] = React.useState<'idle' | 'connecting' | 'signing' | 'result' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [address, setAddress] = React.useState<string | null>(null);
  const [isValid, setIsValid] = React.useState<boolean | null>(null);
  const [signer, setSigner] = React.useState<string | null>(null);

  const INVOICE_DOMAIN = {
    name: 'RobinPay Invoice',
    version: '1',
    chainId: 4663,
    verifyingContract: '0x0000000000000000000000000000000000000000',
  } as const;

  const INVOICE_TYPES = {
    Invoice: [
      { name: 'merchant', type: 'address' },
      { name: 'amount', type: 'string' },
      { name: 'token', type: 'address' },
      { name: 'decimals', type: 'uint8' },
      { name: 'description', type: 'string' },
      { name: 'externalRef', type: 'string' },
      { name: 'exp', type: 'uint64' },
      { name: 'webhookToken', type: 'string' },
    ] as const,
  };

  const handleSign = async () => {
    setError(null);
    setIsValid(null);
    setSigner(null);
    try {
      setStatus('connecting');
      const { address: addr } = await connectWallet();
      setAddress(addr);

      setStatus('signing');
      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet client not available');

      const message = {
        merchant: addr as `0x${string}`,
        amount: '1000000',
        token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        decimals: 18,
        description: 'Test invoice',
        externalRef: 'test-123',
        exp: BigInt(Math.floor(Date.now() / 1000) + 3600),
        webhookToken: '',
      };

      const signature = await walletClient.signTypedData({
        domain: INVOICE_DOMAIN,
        types: INVOICE_TYPES,
        primaryType: 'Invoice',
        message,
        account: addr as `0x${string}`,
      });

      // Verify using recoverTypedDataAddress
      const recovered = await recoverTypedDataAddress({
        domain: INVOICE_DOMAIN,
        types: INVOICE_TYPES,
        primaryType: 'Invoice',
        message,
        signature,
      });

      setIsValid(recovered.toLowerCase() === addr.toLowerCase());
      setSigner(recovered);
      setStatus('result');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border">
      <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-6">Verify EIP-712 Signature</h3>
      <p className="font-mono text-xs text-[#525252] mb-6">
        Sign a test invoice payload with your wallet to verify the EIP-712
        typed-data signing flow used for anti-impersonation on payment links.
      </p>

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

      {status === 'result' && (
        <div className="mb-6 p-4 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded">
          <div className="flex justify-between items-start mb-3">
            <span className="font-mono text-xs text-[#525252]">Signature valid</span>
            <span className={`font-mono text-xs font-bold ${isValid ? 'text-emerald-700' : 'text-red-600'}`}>
              {isValid ? 'VALID' : 'INVALID'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-mono text-xs text-[#525252]">Signer</span>
              <span className="font-mono text-xs text-[#0A0A0A] truncate max-w-xs">{signer}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-xs text-[#525252]">Expected</span>
              <span className="font-mono text-xs text-[#0A0A0A] truncate max-w-xs">{address}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-xs text-[#525252]">Match</span>
              <span className={`font-mono text-xs font-bold ${isValid ? 'text-emerald-700' : 'text-red-600'}`}>
                {isValid ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>
      )}

      <Button
        variant="default"
        onClick={handleSign}
        disabled={status === 'connecting' || status === 'signing'}
        className="w-full"
      >
        {status === 'connecting' ? 'Connecting…' : status === 'signing' ? 'Signing…' : 'Sign Test Invoice'}
      </Button>
    </div>
  );
}
