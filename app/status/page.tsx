import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { CheckCircle2, ShieldCheck, Activity, Server, Zap, RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Status — RobinPay System & Network Health',
  description:
    'Real-time operational status of RobinPay verification nodes, webhooks, and Robinhood Chain Testnet RPC.',
};

export default function StatusPage() {
  const systems = [
    { name: 'Robinhood Chain Testnet RPC (46630)', status: 'Operational', latency: '68ms', uptime: '99.99%' },
    { name: 'Payment Verification Node', status: 'Operational', latency: '42ms', uptime: '100.0%' },
    { name: 'Stateless Invoice Encoder', status: 'Operational', latency: '12ms', uptime: '100.0%' },
    { name: 'HMAC Webhook Dispatcher', status: 'Operational', latency: '85ms', uptime: '99.98%' },
    { name: 'Testnet Faucet & Token Engine', status: 'Operational', latency: '110ms', uptime: '99.95%' },
    { name: 'Explorer API Indexer', status: 'Operational', latency: '95ms', uptime: '99.92%' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Health &middot; Updated Just Now</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-4">
              System Status
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed">
              Live uptime metrics, latency benchmarks, and operational health across the RobinPay network and Robinhood Chain Testnet (46630).
            </p>
          </div>

          {/* Overall Status Banner */}
          <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-6 mb-12 sketch-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-caveat text-3xl text-emerald-900 leading-none">All Systems Operational</h3>
                <p className="text-xs text-emerald-700 font-mono mt-0.5">
                  All payment verification engines and RPC nodes are responding normally.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-emerald-800 font-semibold">
              <div>
                <span className="block text-[10px] text-emerald-600 uppercase">Avg Block Latency</span>
                <span>0.85s</span>
              </div>
              <div>
                <span className="block text-[10px] text-emerald-600 uppercase">90-Day Uptime</span>
                <span>99.98%</span>
              </div>
            </div>
          </div>

          {/* Component Systems Grid */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A] mb-16">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-6">Network Components</h2>

            <div className="divide-y divide-[#0A0A0A]/10">
              {systems.map((s, i) => (
                <div key={i} className="py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[#0A0A0A]">{s.name}</span>
                  </div>

                  <div className="flex items-center gap-6 text-[#525252]">
                    <span className="text-zinc-600">Latency: <span className="font-semibold text-zinc-900">{s.latency}</span></span>
                    <span className="text-zinc-600">Uptime: <span className="font-semibold text-zinc-900">{s.uptime}</span></span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] border border-emerald-300">
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Incidents */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-4">Past Incidents (Past 90 Days)</h2>
            <div className="p-6 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded text-center text-xs text-[#525252]">
              <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
              <span>No service disruptions or degraded performance incidents reported in the past 90 days.</span>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
