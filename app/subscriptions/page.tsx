import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { ArrowRight, RefreshCw, Shield, KeyRound, Clock, Code, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subscriptions — Non-Custodial Recurring Billing on Robinhood Chain',
  description:
    'Charge monthly or weekly SaaS subscriptions on-chain using EIP-712 pre-authorizations and SubscriptionVault on Robinhood Chain.',
};

export default function SubscriptionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Hero */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Product &middot; Recurring Web3 Billing</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-6">
              Non-Custodial Recurring Subscriptions. <br />
              <span className="underline decoration-wavy decoration-[#0A0A0A]/40">Zero Lock-In. Gasless Permits.</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed mb-8">
              Bill customers on a recurring schedule without holding custody or managing seed phrases. RobinPay uses EIP-712 typed signature authorizations and the <code className="bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300">SubscriptionVault.sol</code> smart contract to automate SaaS subscriptions and membership renewals on Robinhood Chain.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="sketch-btn sketch-border px-6 py-3 bg-[#0A0A0A] text-white hover:bg-black text-sm font-semibold flex items-center gap-2 shadow-[3px_3px_0px_#525252]"
              >
                <span>Setup Subscription Plan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="sketch-btn sketch-border-alt px-6 py-3 bg-white text-[#0A0A0A] hover:bg-[#FAFAFA] border-2 border-[#0A0A0A] text-sm font-semibold flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                <span>Subscription SDK Guide</span>
              </Link>
            </div>
          </div>

          {/* Workflow */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A] mb-16">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-6">How Recurring Billing Works</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-dashed border-[#0A0A0A]/30 p-5 rounded bg-[#FAFAFA]">
                <div className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs mb-3">
                  1
                </div>
                <h4 className="font-caveat text-xl text-[#0A0A0A] mb-1">One-Time Permit</h4>
                <p className="font-mono text-xs text-[#525252] leading-relaxed">
                  Customer signs a gasless EIP-712 permit specifying the billing period (e.g. 30 days) and max spending limit in USDC.
                </p>
              </div>

              <div className="border border-dashed border-[#0A0A0A]/30 p-5 rounded bg-[#FAFAFA]">
                <div className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs mb-3">
                  2
                </div>
                <h4 className="font-caveat text-xl text-[#0A0A0A] mb-1">Automated Execution</h4>
                <p className="font-mono text-xs text-[#525252] leading-relaxed">
                  When the renewal interval elapses, your automated worker executes the debit via <code className="bg-white px-1 border border-zinc-200">SubscriptionVault.charge()</code>.
                </p>
              </div>

              <div className="border border-dashed border-[#0A0A0A]/30 p-5 rounded bg-[#FAFAFA]">
                <div className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-xs mb-3">
                  3
                </div>
                <h4 className="font-caveat text-xl text-[#0A0A0A] mb-1">Zero-Trust Revocation</h4>
                <p className="font-mono text-xs text-[#525252] leading-relaxed">
                  Subscribers maintain sovereign control. They can cancel or modify permissions directly on-chain at any moment.
                </p>
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A] mb-16">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-2">SDK Code Example</h2>
            <p className="font-mono text-xs text-[#525252] mb-6">
              Create and manage subscriptions using the typed RobinPay SDK.
            </p>

            <div className="bg-[#0A0A0A] text-zinc-100 rounded p-5 overflow-x-auto text-xs leading-relaxed font-mono">
              <pre><code>{`import { RobinPayClient } from '@robinpay/sdk';

const client = new RobinPayClient({
  network: 'testnet', // Robinhood Chain Testnet (46630)
});

// 1. Generate recurring subscription permit
const subscription = await client.subscriptions.create({
  merchant: '0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead',
  token: 'USDC',
  intervalDays: 30,
  maxAmountPerCycle: '49.00',
  planName: 'Developer Pro Tier',
});

// 2. Charge active subscription on renewal
const txHash = await client.subscriptions.charge({
  subscriptionId: subscription.id,
});`}</code></pre>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
