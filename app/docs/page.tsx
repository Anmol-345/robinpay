import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Terminal, Code, ExternalLink, ShieldCheck, Zap, BookOpen, Layers, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Docs — RobinPay Developer Documentation & Guides',
  description:
    'Comprehensive guides, network details, SDK references, and quickstarts for integrating RobinPay on Robinhood Chain.',
};

export default function DocsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <BookOpen className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>Developer Documentation &middot; Robinhood Chain</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-4">
              RobinPay Documentation
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed">
              Integrate non-custodial crypto checkouts, recurring billing, invoices, and payouts on Robinhood Chain Testnet (Chain ID 46630) with zero database requirements.
            </p>
          </div>

          {/* Network Specifications Card */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A] mb-12">
            <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-dashed border-[#0A0A0A]/20">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">Official Network Configuration</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Active Testnet
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded space-y-1">
                <span className="text-[#525252] text-[11px]">Network Name</span>
                <p className="font-bold text-[#0A0A0A]">Robinhood Chain Testnet</p>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded space-y-1">
                <span className="text-[#525252] text-[11px]">Chain ID</span>
                <p className="font-bold text-[#0A0A0A]">46630 <span className="text-zinc-500 font-normal">(0xb626 hex)</span></p>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded space-y-1">
                <span className="text-[#525252] text-[11px]">RPC Endpoint</span>
                <p className="font-semibold text-zinc-800 select-all">https://rpc.testnet.chain.robinhood.com</p>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded space-y-1">
                <span className="text-[#525252] text-[11px]">Block Explorer</span>
                <a
                  href="https://explorer.testnet.chain.robinhood.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-emerald-700 underline flex items-center gap-1"
                >
                  <span>explorer.testnet.chain.robinhood.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded space-y-1">
                <span className="text-[#525252] text-[11px]">Native Currency</span>
                <p className="font-bold text-[#0A0A0A]">ETH (18 Decimals)</p>
              </div>
              <div className="p-3 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded space-y-1">
                <span className="text-[#525252] text-[11px]">Testnet USDC Contract</span>
                <p className="font-semibold text-zinc-800 text-[11px] select-all truncate" title="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238">
                  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 (6 Decimals)
                </p>
              </div>
            </div>
          </div>

          {/* Quickstart Guide */}
          <div className="space-y-8 mb-16">
            <h2 className="font-caveat text-4xl text-[#0A0A0A]">Quickstart Integration</h2>

            {/* Step 1 */}
            <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h3 className="font-caveat text-2xl text-[#0A0A0A]">Install Dependencies</h3>
              </div>
              <p className="text-xs text-[#525252] mb-3">
                Install the official RobinPay TypeScript SDK and viem peer dependency:
              </p>
              <div className="bg-[#0A0A0A] text-zinc-100 p-4 rounded text-xs font-mono">
                <code>npm install @robinpay/sdk viem</code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h3 className="font-caveat text-2xl text-[#0A0A0A]">Generate a Signed Invoice Token</h3>
              </div>
              <p className="text-xs text-[#525252] mb-3">
                Create an invoice on your backend or via our REST API. No database required:
              </p>
              <div className="bg-[#0A0A0A] text-zinc-100 p-4 rounded text-xs font-mono overflow-x-auto">
                <pre><code>{`// POST https://robinpay.xyz/api/v1/invoices/create
const response = await fetch('https://robinpay.xyz/api/v1/invoices/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    merchant: '0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead',
    amount: '49.00',
    token: 'USDC',
    description: 'Pro Subscription',
    externalRef: 'ORD-2026-1049',
    expiresInMinutes: 1440,
  }),
});

const { token, url } = await response.json();
// Send 'url' directly to customer or open in modal`}</code></pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h3 className="font-caveat text-2xl text-[#0A0A0A]">Listen to Webhooks or Verify On-Chain</h3>
              </div>
              <p className="text-xs text-[#525252] mb-3">
                When the buyer pays, verify the on-chain receipt instantly:
              </p>
              <div className="bg-[#0A0A0A] text-zinc-100 p-4 rounded text-xs font-mono overflow-x-auto">
                <pre><code>{`// POST /api/v1/checkout/verify
const verify = await fetch('https://robinpay.xyz/api/v1/checkout/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: invoiceToken, txHash }),
});

const result = await verify.json();
if (result.status === 'PAID') {
  // Fulfill digital order safely
}`}</code></pre>
              </div>
            </div>
          </div>

          {/* Docs Navigation Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/api-reference"
              className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border hover:shadow-[4px_4px_0px_#0A0A0A] transition-all group"
            >
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2 flex items-center justify-between">
                <span>API Reference</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-[#525252]">
                Detailed endpoints, parameter descriptions, cURL examples, and error schemas.
              </p>
            </Link>

            <a
              href="https://github.com/Anmol-345/robinpay"
              target="_blank"
              rel="noreferrer"
              className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border hover:shadow-[4px_4px_0px_#0A0A0A] transition-all group"
            >
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2 flex items-center justify-between">
                <span>GitHub Repository</span>
                <ExternalLink className="w-4 h-4 text-zinc-500" />
              </h3>
              <p className="text-xs text-[#525252]">
                Explore the open-source contracts, Next.js gateway, and TypeScript SDK.
              </p>
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
