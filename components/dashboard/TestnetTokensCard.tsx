// =============================================================================
// components/dashboard/TestnetTokensCard.tsx — Testnet Tokens & Faucet
// =============================================================================
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { addTestnetTokenToWallet, switchToRobinhoodChain } from '@/lib/chain/wallet';
import {
  Coins,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  Network,
  Droplet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface TestnetTokensCardProps {
  address: string;
}

export function TestnetTokensCard({ address }: TestnetTokensCardProps) {
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [copiedRpc, setCopiedRpc] = React.useState(false);

  // Add to Wallet status
  const [watchStatus, setWatchStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [watchMsg, setWatchMsg] = React.useState<string | null>(null);

  // Switch chain status
  const [chainStatus, setChainStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [chainMsg, setChainMsg] = React.useState<string | null>(null);

  // Faucet state
  const [faucetToken, setFaucetToken] = React.useState<'USDC' | 'ETH'>('USDC');
  const [faucetRecipient, setFaucetRecipient] = React.useState(address);
  const [faucetStatus, setFaucetStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [faucetResult, setFaucetResult] = React.useState<{ txHash: string; message: string } | null>(null);
  const [faucetError, setFaucetError] = React.useState<string | null>(null);

  const usdcContractAddress =
    process.env.NEXT_PUBLIC_USDC_ADDRESS &&
    process.env.NEXT_PUBLIC_USDC_ADDRESS !== '0x0000000000000000000000000000000000000000'
      ? process.env.NEXT_PUBLIC_USDC_ADDRESS
      : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

  const rpcUrl =
    process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL &&
    !process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL.includes('.example')
      ? process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL
      : 'https://rpc.mainnet.chain.robinhood.com';

  const handleAddUSDC = async () => {
    setWatchStatus('loading');
    setWatchMsg(null);
    try {
      const added = await addTestnetTokenToWallet({
        address: usdcContractAddress as `0x${string}`,
        symbol: 'USDC',
        decimals: 6,
      });
      if (added) {
        setWatchStatus('success');
        setWatchMsg('USDC token successfully added to your wallet!');
      } else {
        setWatchStatus('idle');
      }
    } catch (err: unknown) {
      setWatchStatus('error');
      setWatchMsg(err instanceof Error ? err.message : 'Failed to add token to wallet');
    }
  };

  const handleAddChain = async () => {
    setChainStatus('loading');
    setChainMsg(null);
    try {
      await switchToRobinhoodChain();
      setChainStatus('success');
      setChainMsg('Connected to Robinhood Chain Testnet (46630)!');
    } catch (err: unknown) {
      setChainStatus('error');
      setChainMsg(err instanceof Error ? err.message : 'Failed to switch or add network');
    }
  };

  const handleClaimFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaucetStatus('loading');
    setFaucetError(null);
    setFaucetResult(null);

    try {
      const res = await fetch('/api/testnet/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: faucetRecipient.trim(),
          token: faucetToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to claim testnet tokens');
      }

      setFaucetStatus('success');
      setFaucetResult({
        txHash: data.txHash,
        message: data.message,
      });
    } catch (err: unknown) {
      setFaucetStatus('error');
      setFaucetError(err instanceof Error ? err.message : 'Faucet request failed');
    }
  };

  const copyToClipboard = async (text: string, type: 'token' | 'rpc') => {
    await navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedRpc(true);
      setTimeout(() => setCopiedRpc(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-dashed border-[#0A0A0A]/20">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-[#0A0A0A]" />
              <h3 className="font-caveat text-3xl text-[#0A0A0A]">Testnet Tokens & Faucet</h3>
            </div>
            <p className="font-mono text-xs text-[#525252] mt-1">
              Add Robinhood Chain and testnet USDC to your wallet to test non-custodial checkout & escrow.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#0A0A0A] text-white font-mono text-xs font-semibold rounded sketch-border">
            Chain ID: 46630
          </span>
        </div>

        {/* Action Grid: Quick Add to MetaMask */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Option A: Add Testnet USDC */}
          <div className="p-4 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] sketch-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#0A0A0A] flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-700" />
                  Testnet USDC (Stablecoin)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded">
                  6 Decimals
                </span>
              </div>
              <p className="font-mono text-xs text-[#525252] mb-4">
                Adds the Robinhood Chain testnet USDC token definition directly to MetaMask via EIP-747.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleAddUSDC}
                disabled={watchStatus === 'loading'}
                className="sketch-btn w-full py-2.5 px-3 bg-[#0A0A0A] text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 border-2 border-[#0A0A0A] hover:bg-black cursor-pointer disabled:opacity-50"
              >
                {watchStatus === 'loading' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>Add Testnet USDC to Wallet</span>
              </button>

              {watchMsg && (
                <p
                  className={`font-mono text-[11px] mt-2 ${
                    watchStatus === 'success' ? 'text-emerald-700 font-semibold' : 'text-red-600'
                  }`}
                >
                  {watchMsg}
                </p>
              )}
            </div>
          </div>

          {/* Option B: Add Robinhood Chain Network */}
          <div className="p-4 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] sketch-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#0A0A0A] flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-[#0A0A0A]" />
                  Robinhood Chain Network
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-900 font-mono font-bold px-2 py-0.5 rounded">
                  EIP-3085
                </span>
              </div>
              <p className="font-mono text-xs text-[#525252] mb-4">
                Prompts MetaMask to configure and switch to Robinhood Chain Testnet (ID: 46630, Hex: 0xb626).
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleAddChain}
                disabled={chainStatus === 'loading'}
                className="sketch-btn w-full py-2.5 px-3 bg-white text-[#0A0A0A] font-mono text-xs font-semibold flex items-center justify-center gap-2 border-2 border-[#0A0A0A] hover:bg-[#FAFAFA] cursor-pointer disabled:opacity-50"
              >
                {chainStatus === 'loading' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Network className="w-3.5 h-3.5" />
                )}
                <span>Add / Switch Chain in Wallet</span>
              </button>

              {chainMsg && (
                <p
                  className={`font-mono text-[11px] mt-2 ${
                    chainStatus === 'success' ? 'text-emerald-700 font-semibold' : 'text-red-600'
                  }`}
                >
                  {chainMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Faucet Claim Section */}
        <div className="border-2 border-dashed border-[#0A0A0A]/40 rounded-lg p-5 bg-[#FAFAFA] mb-8">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-caveat text-2xl text-[#0A0A0A] flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-600" />
              <span>Instant Testnet Faucet</span>
            </h4>
            <span className="font-mono text-[11px] text-[#525252] bg-white px-2 py-1 rounded border border-[#0A0A0A]/20">
              Demo & Development
            </span>
          </div>

          <p className="font-mono text-xs text-[#525252] mb-4">
            Request testnet tokens directly into your merchant or customer wallet to test payment invoices.
          </p>

          <form onSubmit={handleClaimFaucet} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-mono text-xs text-[#0A0A0A] font-semibold mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  required
                  value={faucetRecipient}
                  onChange={(e) => setFaucetRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-white font-mono text-xs text-[#0A0A0A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-[#0A0A0A] font-semibold mb-1">Select Token</label>
                <select
                  value={faucetToken}
                  onChange={(e) => setFaucetToken(e.target.value as 'USDC' | 'ETH')}
                  className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-white font-mono text-xs text-[#0A0A0A] focus:outline-none cursor-pointer"
                >
                  <option value="USDC">100.00 Testnet USDC</option>
                  <option value="ETH">0.05 Testnet ETH (Gas)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={faucetStatus === 'loading'}
              className="sketch-btn sketch-border py-2.5 px-4 bg-[#0A0A0A] text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 border-2 border-[#0A0A0A] hover:bg-black cursor-pointer disabled:opacity-50"
            >
              {faucetStatus === 'loading' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Claim {faucetToken === 'USDC' ? '100 USDC' : '0.05 ETH'} Faucet</span>
            </button>

            {faucetError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-900 font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{faucetError}</span>
              </div>
            )}

            {faucetResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 font-mono space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{faucetResult.message}</span>
                </div>
                <div className="text-[11px] text-emerald-700 break-all">
                  Tx Hash: {faucetResult.txHash}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Network & Contract Details Table */}
        <div>
          <h4 className="font-mono text-xs font-bold text-[#0A0A0A] mb-3 uppercase tracking-wider">
            Network & Token Specifications
          </h4>

          <div className="border-2 border-[#0A0A0A] rounded overflow-hidden font-mono text-xs">
            <div className="divide-y divide-[#0A0A0A]/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white gap-2">
                <span className="text-[#525252]">Network Name:</span>
                <span className="font-semibold text-[#0A0A0A]">Robinhood Chain Testnet</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAFAFA] gap-2">
                <span className="text-[#525252]">Chain ID:</span>
                <span className="font-semibold text-[#0A0A0A]">46630 (Hex: 0xb626)</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white gap-2">
                <span className="text-[#525252]">Native Gas Token:</span>
                <span className="font-semibold text-[#0A0A0A]">ETH (18 Decimals)</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAFAFA] gap-2">
                <span className="text-[#525252]">USDC Contract Address:</span>
                <div className="flex items-center gap-2">
                  <code className="text-[#0A0A0A] bg-white px-2 py-0.5 border border-[#0A0A0A]/20 rounded text-[11px] break-all">
                    {usdcContractAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(usdcContractAddress, 'token')}
                    className="p-1 hover:bg-[#0A0A0A]/10 rounded cursor-pointer"
                    title="Copy USDC Contract Address"
                  >
                    {copiedToken ? (
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#525252]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white gap-2">
                <span className="text-[#525252]">RPC Endpoint:</span>
                <div className="flex items-center gap-2">
                  <code className="text-[#0A0A0A] bg-[#FAFAFA] px-2 py-0.5 border border-[#0A0A0A]/20 rounded text-[11px]">
                    {rpcUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(rpcUrl, 'rpc')}
                    className="p-1 hover:bg-[#0A0A0A]/10 rounded cursor-pointer"
                    title="Copy RPC URL"
                  >
                    {copiedRpc ? (
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#525252]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
