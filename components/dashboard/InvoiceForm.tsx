// =============================================================================
// components/dashboard/InvoiceForm.tsx — Non-custodial invoice generation
// =============================================================================
// Calls POST /api/v1/invoices/create with the authenticated merchant wallet address.
// Returns a signed stateless invoice token + pay URL. Nothing is stored server-side.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { parseUnits } from 'viem';
import { Copy, Check, ExternalLink, ShieldCheck, Plus, Trash2, ArrowRight, Shuffle, Sparkles } from 'lucide-react';

interface InvoiceFormProps {
  address: string;
}

export function InvoiceForm({ address }: InvoiceFormProps) {
  const [amount, setAmount] = React.useState('49.00');
  const [token, setToken] = React.useState<'USDC' | 'ETH'>('USDC');
  const [description, setDescription] = React.useState('');
  const [externalRef, setExternalRef] = React.useState('');

  const handleGenerateOrderId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(6);
      window.crypto.getRandomValues(bytes);
      for (let i = 0; i < 6; i++) {
        rand += chars[bytes[i] % chars.length];
      }
    } else {
      rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const year = new Date().getFullYear();
    setExternalRef(`ORD-${year}-${rand}`);
  };
  const [expiresInMinutes, setExpiresInMinutes] = React.useState(60 * 24);
  const [escrowEnabled, setEscrowEnabled] = React.useState(false);
  const [milestones, setMilestones] = React.useState<Array<{ title: string; amount: string; releaseInDays: number }>>([
    { title: 'Milestone 1', amount: '', releaseInDays: 7 },
  ]);
  const [status, setStatus] = React.useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [result, setResult] = React.useState<{ url: string; orderId: string; token: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const tokenDecimals = token === 'USDC' ? 6 : 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('creating');

    try {
      const body: Record<string, unknown> = {
        merchant: address,
        amount,
        token,
        description: description || undefined,
        externalRef: externalRef || undefined,
        expiresInMinutes,
        escrow: {
          enabled: escrowEnabled,
          milestones: escrowEnabled ? milestones : undefined,
        },
      };

      const res = await fetch('/api/v1/invoices/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Invoice creation failed');
      }

      const data = await res.json();
      setResult(data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copyPayUrl = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseAmount = parseUnits(amount || '0', tokenDecimals);

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b-2 border-dashed border-[#0A0A0A]/20">
        <div>
          <h3 className="font-caveat text-3xl text-[#0A0A0A]">Create Invoice</h3>
          <p className="font-mono text-xs text-[#525252] mt-0.5">
            Stateless, cryptographic invoice payment link on Robinhood Chain.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFAFA] border border-[#0A0A0A]/30 rounded sketch-border text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span className="font-mono text-[#525252]">Merchant:</span>
          <span className="font-mono font-semibold text-[#0A0A0A] truncate max-w-[150px] sm:max-w-[200px]" title={address}>
            {address}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block font-mono text-xs text-[#0A0A0A] font-semibold mb-1">
              Amount ({token})
            </label>
            <input
              type="number"
              step="any"
              min="0.000001"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="49.00"
              className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] font-mono text-sm text-[#0A0A0A] focus:bg-white focus:outline-none"
            />
            <p className="font-mono text-[11px] text-[#525252] mt-1" suppressHydrationWarning>
              {token === 'USDC' ? '6 decimals' : '18 decimals'} &nbsp;·&nbsp; ~{Number(baseAmount).toLocaleString('en-US')} base units
            </p>
          </div>

          <div>
            <label className="block font-mono text-xs text-[#0A0A0A] font-semibold mb-1">Payment Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value as 'USDC' | 'ETH')}
              className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] font-mono text-sm text-[#0A0A0A] focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="USDC">USDC (Robinhood Chain)</option>
              <option value="ETH">ETH (Native)</option>
            </select>
            <p className="font-mono text-[11px] text-[#525252] mt-1">Direct wallet settlement</p>
          </div>
        </div>

        <div>
          <label className="block font-mono text-xs text-[#0A0A0A] font-semibold mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. RobinPay Pro Subscription, Invoice #1042"
            className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] font-mono text-sm text-[#0A0A0A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-mono text-xs text-[#0A0A0A] font-semibold">
                External Ref / Order ID (optional)
              </label>
              <button
                type="button"
                onClick={handleGenerateOrderId}
                className="font-mono text-[11px] text-[#525252] hover:text-[#0A0A0A] flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                title="Generate randomized Order ID"
              >
                <Sparkles className="w-3 h-3 text-[#0A0A0A]" />
                <span>Auto-generate</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="ORD-2026-X9K2"
                className="w-full p-2.5 pr-24 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] font-mono text-sm text-[#0A0A0A] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateOrderId}
                className="absolute right-1.5 px-2.5 py-1 bg-white hover:bg-[#F5F5F5] border border-[#0A0A0A] text-[#0A0A0A] font-mono text-xs font-semibold rounded flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Generate randomized Order ID"
              >
                <Shuffle className="w-3 h-3" />
                <span>Generate</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-[#0A0A0A] font-semibold mb-1">Expiry Duration</label>
            <select
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(parseInt(e.target.value, 10))}
              className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] font-mono text-sm text-[#0A0A0A] focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value={60}>1 Hour</option>
              <option value={60 * 24}>24 Hours</option>
              <option value={60 * 24 * 7}>7 Days</option>
              <option value={60 * 24 * 30}>30 Days</option>
            </select>
          </div>
        </div>

        {/* Escrow Option */}
        <div className="border border-dashed border-[#0A0A0A]/40 rounded p-4 bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="escrow-toggle"
              checked={escrowEnabled}
              onChange={(e) => setEscrowEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#0A0A0A] rounded cursor-pointer"
            />
            <label htmlFor="escrow-toggle" className="font-mono text-xs text-[#0A0A0A] font-semibold cursor-pointer">
              Enable Milestone Escrow Contract
            </label>
          </div>
          <p className="font-mono text-xs text-[#525252] mt-1 ml-7">
            Buyer funds are held in the escrow contract and released in stages.
          </p>

          {escrowEnabled && (
            <div className="mt-4 pt-4 border-t border-[#0A0A0A]/10 space-y-3">
              <label className="block font-mono text-xs text-[#0A0A0A] font-semibold">Milestones</label>
              {milestones.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={m.title}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[i].title = e.target.value;
                      setMilestones(next);
                    }}
                    placeholder="Milestone title"
                    className="flex-2 min-w-[140px] p-2 border border-[#0A0A0A]/40 rounded bg-white font-mono text-xs text-[#0A0A0A]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={m.amount}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[i].amount = e.target.value;
                      setMilestones(next);
                    }}
                    placeholder="Amount"
                    className="flex-1 min-w-[90px] p-2 border border-[#0A0A0A]/40 rounded bg-white font-mono text-xs text-[#0A0A0A]"
                  />
                  <input
                    type="number"
                    value={m.releaseInDays}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[i].releaseInDays = parseInt(e.target.value, 10) || 1;
                      setMilestones(next);
                    }}
                    placeholder="Days"
                    className="w-20 p-2 border border-[#0A0A0A]/40 rounded bg-white font-mono text-xs text-[#0A0A0A]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = [...milestones];
                      next.splice(i, 1);
                      setMilestones(next);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMilestones([...milestones, { title: `Milestone ${milestones.length + 1}`, amount: '', releaseInDays: 7 }])}
                className="sketch-btn font-mono text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </Button>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="default"
          disabled={status === 'creating'}
          className="sketch-btn sketch-border w-full py-3 bg-[#0A0A0A] text-white hover:bg-black font-mono text-sm font-semibold cursor-pointer shadow-[2px_2px_0px_#525252] disabled:opacity-50"
        >
          {status === 'creating' ? 'Generating Signed Invoice…' : 'Generate Invoice Pay Link'}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border-2 border-red-300 rounded text-xs text-red-900 font-mono">
            {error}
          </div>
        )}

        {status === 'success' && result && (
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-5 sketch-border mt-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-200">
              <span className="font-mono text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-700" />
                Invoice Created Successfully
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPayUrl}
                  className="sketch-btn px-3 py-1 bg-white border border-[#0A0A0A] text-xs font-mono font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-100"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Pay URL'}</span>
                </button>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sketch-btn px-3 py-1 bg-[#0A0A0A] text-white border border-[#0A0A0A] text-xs font-mono font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Pay Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[#525252] block mb-1">Customer Checkout URL:</span>
                <div className="p-2 bg-white border border-emerald-300 rounded break-all select-all font-semibold text-[#0A0A0A]">
                  {result.url}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[#525252] block">Order ID (keccak256):</span>
                  <span className="text-[#0A0A0A] font-semibold break-all">{result.orderId}</span>
                </div>
                <div>
                  <span className="text-[#525252] block">Token Hash:</span>
                  <span className="text-[#0A0A0A] font-semibold break-all">{result.token.slice(0, 24)}…</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
