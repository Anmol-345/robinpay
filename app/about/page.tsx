import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { ShieldCheck, HeartHandshake, Zap, ArrowRight, ExternalLink, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — Non-Custodial Payments on Robinhood Chain',
  description:
    'RobinPay is an open-source, non-custodial crypto payment gateway eliminating intermediary custody and processing fees on Robinhood Chain.',
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Our Mission &middot; Open Source &amp; Non-Custodial</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-6">
              Payments, minus the middlemen.
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed mb-8">
              RobinPay was built with a single objective: to dismantle the antiquated 2.9% + $0.30 tollbooth of legacy payment processors. By combining the speed of the Robinhood Chain Arbitrum Orbit rollup with stateless EIP-712 cryptography, we give every builder instant, non-custodial payment rails.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="sketch-btn sketch-border px-6 py-3 bg-[#0A0A0A] text-white hover:bg-black text-sm font-semibold flex items-center gap-2 shadow-[3px_3px_0px_#525252]"
              >
                <span>Try the Merchant Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/Anmol-345/robinpay"
                target="_blank"
                rel="noreferrer"
                className="sketch-btn sketch-border-alt px-6 py-3 bg-white text-[#0A0A0A] hover:bg-[#FAFAFA] border-2 border-[#0A0A0A] text-sm font-semibold flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              </a>
            </div>
          </div>

          {/* Three Core Tenets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Absolute Non-Custody</h3>
              <p className="text-xs text-[#525252] leading-relaxed">
                Traditional processors hold your revenue for days or lock it behind reserves. RobinPay never touches your keys or pools your crypto. Settlement is atomic and direct to your wallet.
              </p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] text-white flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Zero Database Vulnerability</h3>
              <p className="text-xs text-[#525252] leading-relaxed">
                Invoices are stateless cryptographic tokens signed by the merchant. No database to maintain, no user credential honeypots, and no downtime from backend outages.
              </p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] text-white flex items-center justify-center mb-4">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Built for Robinhood Chain</h3>
              <p className="text-xs text-[#525252] leading-relaxed">
                Optimized specifically for Robinhood Chain’s ultra-fast block times and sub-cent transaction costs, making micro-transactions and everyday purchases viable.
              </p>
            </div>
          </div>

          {/* Story & Philosophy */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-4">The Architecture Behind RobinPay</h2>
            <div className="space-y-4 text-xs sm:text-sm text-[#525252] leading-relaxed">
              <p>
                In 2026, commerce remains throttled by legacy financial rails designed in the 1970s. Centralized processors charge punitive percentage fees, impose sudden account terminations on lawful internet businesses, and subject cross-border transactions to punitive currency conversion surcharges.
              </p>
              <p>
                RobinPay replaces centralized intermediaries with pure mathematics and transparent smart contracts. Every invoice is verifiable on-chain, every subscription can be audited and cancelled permissionlessly by the subscriber, and every batch payout executes in a single transaction.
              </p>
              <p>
                We believe the future of internet commerce belongs to developers who build sovereign, permissionless, and open-source applications.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
