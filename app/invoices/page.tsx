import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { ArrowRight, FileText, Database, ShieldCheck, Lock, ExternalLink, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Invoices — Cryptographic, Zero-Database Invoicing on Robinhood Chain',
  description:
    'Generate tamper-proof, self-contained crypto payment invoices on Robinhood Chain Testnet with optional milestone escrow.',
};

export default function InvoicesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Hero */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Product &middot; Non-Custodial Invoicing</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-6">
              Stateless Crypto Invoicing. <br />
              <span className="underline decoration-wavy decoration-[#0A0A0A]/40">Zero Database. 100% Cryptographic.</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed mb-8">
              Forget clunky payment databases and hosted invoice leaks. RobinPay encodes the recipient address, exact payment token, decimal precision, amount, and expiry duration into a tamper-proof cryptographic invoice token (<code className="bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300">inv_...</code>).
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="sketch-btn sketch-border px-6 py-3 bg-[#0A0A0A] text-white hover:bg-black text-sm font-semibold flex items-center gap-2 shadow-[3px_3px_0px_#525252]"
              >
                <span>Create Invoice in Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="sketch-btn sketch-border-alt px-6 py-3 bg-white text-[#0A0A0A] hover:bg-[#FAFAFA] border-2 border-[#0A0A0A] text-sm font-semibold flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                <span>Invoice Token Specs</span>
              </Link>
            </div>
          </div>

          {/* Anatomy of an Invoice */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A] mb-16">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-2">The Stateless Invoice Token</h2>
            <p className="font-mono text-xs text-[#525252] mb-6">
              How RobinPay securely encodes complete invoice parameters inside the payment link without touching a server database:
            </p>

            <div className="p-4 bg-[#FAFAFA] border border-[#0A0A0A]/30 rounded font-mono text-xs text-zinc-700 break-all mb-6">
              <span className="text-emerald-700 font-bold">https://robinpay.xyz/pay/</span>
              <span className="text-blue-700 font-semibold">inv_eyJtZXJjaGFudCI6IjB4MmFlMjVm...</span>
              <span className="text-zinc-500">.742d2e708f712919787c...</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border border-dashed border-[#0A0A0A]/30 rounded bg-[#FAFAFA]">
                <h4 className="font-semibold text-xs text-[#0A0A0A] mb-1">1. Base64URL Payload</h4>
                <p className="text-[11px] text-[#525252]">
                  Encodes merchant wallet, token address, amount, order ID, description, and unix expiry timestamp.
                </p>
              </div>
              <div className="p-4 border border-dashed border-[#0A0A0A]/30 rounded bg-[#FAFAFA]">
                <h4 className="font-semibold text-xs text-[#0A0A0A] mb-1">2. Cryptographic Signature</h4>
                <p className="text-[11px] text-[#525252]">
                  HMAC-SHA256 signature or EIP-712 merchant wallet signature guaranteeing the amount cannot be altered by a payer.
                </p>
              </div>
              <div className="p-4 border border-dashed border-[#0A0A0A]/30 rounded bg-[#FAFAFA]">
                <h4 className="font-semibold text-xs text-[#0A0A0A] mb-1">3. Direct On-Chain Settlement</h4>
                <p className="text-[11px] text-[#525252]">
                  The checkout page decodes the payload in the browser and constructs the exact transaction to your merchant address.
                </p>
              </div>
            </div>
          </div>

          {/* Milestone Escrow Callout */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded bg-[#0A0A0A] text-white flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="font-caveat text-3xl text-[#0A0A0A]">Milestone Escrow Integration</h2>
            </div>
            <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed mb-6">
              Selling software development or consulting services? Toggle Milestone Escrow when creating an invoice. Buyer funds are securely held in <code className="bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300">EscrowInvoice.sol</code> on Robinhood Chain and released in phases upon milestone sign-off.
            </p>
            <Link
              href="/dashboard"
              className="sketch-btn sketch-border px-5 py-2.5 bg-[#0A0A0A] text-white hover:bg-black text-xs font-semibold inline-flex items-center gap-2"
            >
              <span>Try Creating an Escrow Invoice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
