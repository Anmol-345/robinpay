// =============================================================================
// components/dashboard/EventFeed.tsx — Pull missed on-chain events
// =============================================================================
// Calls GET /api/v1/events?merchant=0x... to surface recent
// PaymentProcessed logs directly from Robinhood Chain Testnet (46630). Keyless & non-custodial.
'use client';

import * as React from 'react';
import { RefreshCw, Activity, ExternalLink, CheckCircle2 } from 'lucide-react';

interface EventItem {
  type: string;
  blockNumber: string;
  txHash: string;
  args: Record<string, unknown>;
}

interface EventFeedProps {
  address: string;
}

const EXPLORER_BASE = 'https://explorer.testnet.chain.robinhood.com';

export function EventFeed({ address }: EventFeedProps) {
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [status, setStatus] = React.useState<'idle' | 'loading'>('idle');

  const loadEvents = React.useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/v1/events?merchant=${encodeURIComponent(address)}`, {
        cache: 'no-store',
      });
      let serverEvents: EventItem[] = [];
      if (res.ok) {
        const data = await res.json();
        serverEvents = data.events || [];
      }

      // Also read local client-recorded events from localStorage
      let localEvents: EventItem[] = [];
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `robinpay_events_${address.toLowerCase()}`;
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            localEvents = JSON.parse(raw);
          }
        } catch {
          // Ignore storage read error
        }
      }

      // Merge and deduplicate by txHash
      const map = new Map<string, EventItem>();
      for (const ev of serverEvents) {
        if (ev.txHash) map.set(ev.txHash.toLowerCase(), ev);
      }
      for (const ev of localEvents) {
        if (ev.txHash && !map.has(ev.txHash.toLowerCase())) {
          map.set(ev.txHash.toLowerCase(), ev);
        }
      }

      const merged = Array.from(map.values());
      // Sort reverse chronological
      merged.sort((a, b) => {
        const timeA = typeof a.args?.timestamp === 'string' ? new Date(a.args.timestamp).getTime() : 0;
        const timeB = typeof b.args?.timestamp === 'string' ? new Date(b.args.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setEvents(merged);
    } catch (err) {
      console.error('[EventFeed] Failed to load events:', err);
    } finally {
      setStatus('idle');
    }
  }, [address]);

  React.useEffect(() => {
    loadEvents();

    const handleStorageOrCustom = () => {
      loadEvents();
    };

    window.addEventListener('storage', handleStorageOrCustom);
    window.addEventListener('robinpay_payment_recorded', handleStorageOrCustom);

    return () => {
      window.removeEventListener('storage', handleStorageOrCustom);
      window.removeEventListener('robinpay_payment_recorded', handleStorageOrCustom);
    };
  }, [loadEvents]);

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b-2 border-dashed border-[#0A0A0A]/20">
        <div>
          <h3 className="font-caveat text-3xl text-[#0A0A0A]">On-Chain Event Log</h3>
          <p className="font-mono text-xs text-[#525252] mt-0.5">
            Real-time PaymentProcessed and Escrow logs for your merchant wallet on Robinhood Testnet.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEvents}
          disabled={status === 'loading'}
          className="sketch-btn font-mono text-xs flex items-center gap-1.5 cursor-pointer bg-[#0A0A0A] text-white hover:bg-black active:translate-x-0.5 active:translate-y-0.5 border-2 border-[#0A0A0A] shadow-[2px_2px_0px_#525252] px-3.5 py-1.5 rounded disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${status === 'loading' ? 'animate-spin' : ''}`} />
          <span className="text-white font-semibold">{status === 'loading' ? 'Refreshing…' : 'Refresh Events'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-[#0A0A0A] bg-[#FAFAFA]">
              <th className="py-2.5 px-3 font-mono text-xs text-[#0A0A0A] font-semibold">Event Type</th>
              <th className="py-2.5 px-3 font-mono text-xs text-[#0A0A0A] font-semibold">Block</th>
              <th className="py-2.5 px-3 font-mono text-xs text-[#0A0A0A] font-semibold">Tx Hash</th>
              <th className="py-2.5 px-3 font-mono text-xs text-[#0A0A0A] font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center font-mono text-xs text-[#525252]">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-[#525252]/50" />
                  No payment events detected yet for this merchant wallet.
                </td>
              </tr>
            ) : (
              events.map((ev, i) => {
                const payer = ev.args?.payer ? String(ev.args.payer) : '';
                const amount = ev.args?.amount ? String(ev.args.amount) : '';
                const orderId = ev.args?.orderId || ev.args?.externalRef;
                const formattedPayer = payer && payer !== '0x0000000000000000000000000000000000000000'
                  ? `${payer.slice(0, 6)}…${payer.slice(-4)}`
                  : 'Customer';

                return (
                  <tr key={i} className="border-b border-[#0A0A0A]/20 hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-[#0A0A0A]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        {ev.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#525252]">{ev.blockNumber}</td>
                    <td className="py-3 px-3 font-mono text-xs font-mono">
                      <a
                        href={`${EXPLORER_BASE}/tx/${ev.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0A0A0A] hover:underline hover:text-emerald-700 font-semibold max-w-[150px] sm:max-w-xs truncate"
                        title={ev.txHash}
                      >
                        <span className="truncate">{ev.txHash.slice(0, 10)}…{ev.txHash.slice(-8)}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 text-zinc-500" />
                      </a>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-[#0A0A0A]">
                      <div className="flex flex-wrap items-center gap-2">
                        {amount && (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {amount}
                          </span>
                        )}
                        {formattedPayer && (
                          <span className="text-[#525252]">
                            From: <span className="font-semibold text-[#0A0A0A]">{formattedPayer}</span>
                          </span>
                        )}
                        {Boolean(orderId) && (
                          <span className="text-[11px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                            {String(orderId)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
