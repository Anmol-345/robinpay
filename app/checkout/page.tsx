import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, Code, Terminal, ExternalLink, RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Checkout — One-Click Crypto Checkout on Robinhood Chain',
  description:
    'Accept ETH and USDC with zero custody, instant settlement, and direct-to-wallet transfers on Robinhood Chain Testnet (46630).',
};

export default function CheckoutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Hero */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Product &middot; Hosted &amp; Embedded Checkout</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-6">
              One-Click Crypto Checkout. <br />
              <span className="underline decoration-wavy decoration-[#0A0A0A]/40">Zero Custody. Instant Settlement.</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed mb-8">
              Turn any web app into an on-chain point of sale in minutes. Customers pay in native ETH or testnet USDC directly to your merchant wallet on Robinhood Chain Testnet (Chain ID 46630). No merchant account approvals, no frozen funds.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="sketch-btn sketch-border px-6 py-3 bg-[#0A0A0A] text-white hover:bg-black text-sm font-semibold flex items-center gap-2 shadow-[3px_3px_0px_#525252]"
              >
                <span>Create Checkout Invoice</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="sketch-btn sketch-border-alt px-6 py-3 bg-white text-[#0A0A0A] hover:bg-[#FAFAFA] border-2 border-[#0A0A0A] text-sm font-semibold flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                <span>Read Integration Docs</span>
              </Link>
            </div>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] flex items-center justify-center text-white mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Non-Custodial by Design</h3>
              <p className="font-mono text-xs text-[#525252] leading-relaxed">
                Funds route directly from buyer to merchant. RobinPay never pools, holds, touches, or delays your payments.
              </p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] flex items-center justify-center text-white mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Sub-Second Finality</h3>
              <p className="font-mono text-xs text-[#525252] leading-relaxed">
                Built on Robinhood Chain Arbitrum Orbit rollup. Transactions confirm in under 1 second with near-zero gas fees.
              </p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] flex items-center justify-center text-white mb-4">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Automated Webhooks</h3>
              <p className="font-mono text-xs text-[#525252] leading-relaxed">
                Cryptographically signed HMAC webhooks fire immediately upon block confirmation to fulfill digital orders.
              </p>
            </div>
          </div>

          {/* Quickstart Code Block */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A] mb-20">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-dashed border-[#0A0A0A]/20">
              <div>
                <h2 className="font-caveat text-3xl text-[#0A0A0A]">5-Line React Integration</h2>
                <p className="font-mono text-xs text-[#525252] mt-1">
                  Drop our prebuilt button or link directly to the hosted payment interface.
                </p>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 bg-zinc-100 border border-zinc-300 rounded">
                npm i @robinpay/sdk
              </span>
            </div>

            <div className="bg-[#0A0A0A] text-zinc-100 rounded p-5 overflow-x-auto text-xs leading-relaxed font-mono">
              <pre><code>{`import { RobinPayButton } from '@robinpay/sdk';

export function CheckoutWidget() {
  return (
    <RobinPayButton
      invoiceToken="inv_eyJtZXJjaGFudCI6IjB4MmFlMjVm..."
      onSuccess={({ orderId, txHash }) => {
        console.log('Payment confirmed on Robinhood Testnet!', orderId, txHash);
      }}
      onError={(err) => console.error('Payment error', err)}
    />
  );
}`}</code></pre>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-6">Why RobinPay vs Traditional Gateways</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#0A0A0A] bg-[#FAFAFA]">
                    <th className="py-3 px-4 font-semibold text-[#0A0A0A]">Feature</th>
                    <th className="py-3 px-4 font-semibold text-emerald-700">RobinPay</th>
                    <th className="py-3 px-4 font-semibold text-[#525252]">Stripe / Traditional</th>
                    <th className="py-3 px-4 font-semibold text-[#525252]">Centralized Crypto Gateways</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0A0A0A]/10">
                  <tr>
                    <td className="py-3 px-4 font-semibold">Processing Fee</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">0% Protocol Fee</td>
                    <td className="py-3 px-4 text-[#525252]">2.9% + $0.30</td>
                    <td className="py-3 px-4 text-[#525252]">1.0% - 2.5% + withdrawal fees</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Settlement Time</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">&lt; 1 Second</td>
                    <td className="py-3 px-4 text-[#525252]">2 - 7 Business Days</td>
                    <td className="py-3 px-4 text-[#525252]">Hours to Days</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Fund Custody</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">Direct to Merchant Wallet</td>
                    <td className="py-3 px-4 text-[#525252]">Processor Holds Funds</td>
                    <td className="py-3 px-4 text-[#525252]">Exchange Custody</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Chargeback Risk</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">0% (Irreversible On-Chain)</td>
                    <td className="py-3 px-4 text-[#525252]">High (up to 120 days)</td>
                    <td className="py-3 px-4 text-[#525252]">Low</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Network</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">Robinhood Chain (46630)</td>
                    <td className="py-3 px-4 text-[#525252]">Traditional Banking Rails</td>
                    <td className="py-3 px-4 text-[#525252]">Various / Congested L1s</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
