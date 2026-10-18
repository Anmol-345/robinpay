// =============================================================================
// components/dashboard/EventFeed.tsx — Pull missed on-chain events
// =============================================================================
// Calls GET /api/v1/events with the merchant's sk_ key to surface recent
// PaymentProcessed logs. Nothing is stored server-side.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export function EventFeed() {
  const [apiKey, setApiKey] = React.useState('');
  const [events, setEvents] = React.useState<Array<{ type: string; blockNumber: string; txHash: string; args: Record<string, unknown> }>>([]);
  const [status, setStatus] = React.useState<'idle' | 'loading'>('idle');

  const loadEvents = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/v1/events', {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border">
      <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-6">Events</h3>
      <p className="font-mono text-xs text-[#525252] mb-4">
        Pull missed payment events from the blockchain. Requires your sk_ key.
      </p>

      <div className="flex gap-3 mb-6">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_test_..."
          className="flex-1 p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
        />
        <Button
          variant="default"
          onClick={loadEvents}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Loading…' : 'Refresh events'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#0A0A0A]">
              <th className="pb-2 font-mono text-xs text-[#525252] font-normal">Type</th>
              <th className="pb-2 font-mono text-xs text-[#525252] font-normal">Block</th>
              <th className="pb-2 font-mono text-xs text-[#525252] font-normal">Tx Hash</th>
              <th className="pb-2 font-mono text-xs text-[#525252] font-normal">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center font-mono text-xs text-[#525252]">
                  No events found. Add your sk_ key and refresh.
                </td>
              </tr>
            ) : (
              events.map((ev, i) => (
                <tr key={i} className="border-b border-[#0A0A0A]/20">
                  <td className="py-3 font-mono text-xs text-[#0A0A0A]">{ev.type}</td>
                  <td className="py-3 font-mono text-xs text-[#0A0A0A]">{ev.blockNumber}</td>
                  <td className="py-3 font-mono text-xs text-[#0A0A0A] truncate max-w-xs">{ev.txHash}</td>
                  <td className="py-3 font-mono text-xs text-[#0A0A0A]">
                    {ev.args.payer ? `Payer: ${(ev.args.payer as string).slice(0, 6)}…${(ev.args.payer as string).slice(-4)}` : ''}
                    {ev.args.amount ? ` · Amount: ${ev.args.amount}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
