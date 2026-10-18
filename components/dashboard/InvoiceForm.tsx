// =============================================================================
// components/dashboard/InvoiceForm.tsx — Create invoices via sk_ API key
// =============================================================================
// Calls POST /api/v1/invoices/create with a bearer sk_ key. Returns a signed
// invoice token + pay URL. Nothing is stored server-side.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { parseUnits } from 'viem';

export function InvoiceForm() {
  const [apiKey, setApiKey] = React.useState('');
  const [amount, setAmount] = React.useState('49.00');
  const [token, setToken] = React.useState<'USDC' | 'ETH'>('USDC');
  const [description, setDescription] = React.useState('');
  const [externalRef, setExternalRef] = React.useState('');
  const [expiresInMinutes, setExpiresInMinutes] = React.useState(60 * 24);
  const [escrowEnabled, setEscrowEnabled] = React.useState(false);
  const [milestones, setMilestones] = React.useState<Array<{ title: string; amount: string; releaseInDays: number }>>([
    { title: 'Milestone 1', amount: '', releaseInDays: 7 },
  ]);
  const [status, setStatus] = React.useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [result, setResult] = React.useState<{ url: string; orderId: string; token: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const tokenDecimals = token === 'USDC' ? 6 : 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('creating');

    try {
      const body: Record<string, unknown> = {
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
          Authorization: `Bearer ${apiKey}`,
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
  };

  const baseAmount = parseUnits(amount, tokenDecimals);

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border">
      <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-6">Create Invoice</h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs text-[#525252] mb-1">API Key (sk_)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_test_..."
              className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
            />
          </div>
          <div className="flex items-end">
            <label className="mr-2 font-mono text-xs text-[#525252]">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value as 'USDC' | 'ETH')}
              className="p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
            >
              <option value="USDC">USDC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-mono text-xs text-[#525252] mb-1">Amount</label>
          <input
            type="number"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="49.00"
            className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
          />
          <p className="font-mono text-xs text-[#525252] mt-1">
            {token === 'USDC' ? '6 decimals' : '18 decimals'} &nbsp;·&nbsp; ~{Number(baseAmount).toLocaleString()} base units
          </p>
        </div>

        <div>
          <label className="block font-mono text-xs text-[#525252] mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dev Membership Pass"
            className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-[#525252] mb-1">External Ref (optional)</label>
          <input
            type="text"
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            placeholder="order-123"
            className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-[#525252] mb-1">Expires in (minutes)</label>
          <input
            type="number"
            value={expiresInMinutes}
            onChange={(e) => setExpiresInMinutes(parseInt(e.target.value, 10) || 60 * 24)}
            className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
          />
        </div>

        <div className="items-start gap-3 pt-2">
          <input
            type="checkbox"
            checked={escrowEnabled}
            onChange={(e) => setEscrowEnabled(e.target.checked)}
            className="w-4 h-4 border border-[#0A0A0A] rounded bg-[#FAFAFA]"
          />
          <div>
            <label className="font-mono text-xs text-[#0A0A0A] font-semibold">Escrow (milestone-based)</label>
            <p className="font-mono text-xs text-[#525252]">Funds held; released per milestone.</p>
          </div>
        </div>

        {escrowEnabled && (
          <div className="bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded p-4">
            <label className="block font-mono text-xs text-[#525252] mb-3">Milestones</label>
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                <input
                  value={m.title}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[i].title = e.target.value;
                    setMilestones(next);
                  }}
                  placeholder="Title"
                  className="p-2 border border-[#0A0A0A]/30 rounded bg-white font-mono text-xs text-[#0A0A0A]"
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
                  className="p-2 border border-[#0A0A0A]/30 rounded bg-white font-mono text-xs text-[#0A0A0A]"
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
                  className="p-2 border border-[#0A0A0A]/30 rounded bg-white font-mono text-xs text-[#0A0A0A]"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const next = [...milestones];
                    next.splice(i, 1);
                    setMilestones(next);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setMilestones([...milestones, { title: '', amount: '', releaseInDays: 7 }])}>
              Add milestone
            </Button>
            <p className="font-mono text-xs text-[#525252] mt-2">
              Milestone sum must equal total amount.
            </p>
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          disabled={status === 'creating'}
          className="w-full"
        >
          {status === 'creating' ? 'Creating…' : 'Create Invoice'}
        </Button>

        {error && (
          <p className="font-mono text-xs text-red-600">{error}</p>
        )}

        {status === 'success' && result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono text-xs text-emerald-700">Invoice created</span>
              <Button variant="ghost" size="sm" onClick={copyPayUrl}>
                Copy URL
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-mono text-xs text-[#525252]">Pay URL</span>
                <span className="font-mono text-xs text-[#0A0A0A] break-all truncate max-w-xs">{result.url}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs text-[#525252]">Order ID</span>
                <span className="font-mono text-xs text-[#0A0A0A] break-all">{result.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs text-[#525252]">Token</span>
                <span className="font-mono text-xs text-[#0A0A0A]">{result.token.slice(0, 20)}…</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
