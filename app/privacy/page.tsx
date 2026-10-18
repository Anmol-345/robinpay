import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Shield, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — Zero-Knowledge Data Principles — RobinPay',
  description:
    'RobinPay privacy policy: zero customer PII collection, stateless cryptographic invoices, and non-custodial architecture.',
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[900px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <Lock className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>Data Protection &middot; Zero-PII Architecture</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-4">
              Privacy Policy
            </h1>
            <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
              Our privacy principle is simple: the most secure data is the data we never collect.
            </p>
          </div>

          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sm:p-10 sketch-border shadow-[4px_4px_0px_#0A0A0A] space-y-8 text-xs sm:text-sm text-[#525252] leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">1. Zero Collection of Personal Financial Data</h2>
              <p>
                Unlike traditional payment processors, RobinPay does not collect, process, or store customer credit card numbers, bank account routing details, Social Security Numbers, government IDs, or physical home addresses.
              </p>
              <p>
                Payment authorization is executed cryptographically through the user’s self-custodial wallet (e.g., MetaMask, Coinbase Wallet, Rabby) directly to the blockchain network.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">2. Public Blockchain Records</h2>
              <p>
                Transactions processed on Robinhood Chain are broadcast to a public, distributed ledger. Information such as the sender address, recipient address, transferred amount, and transaction timestamp are visible publicly on blockchain explorers. This transparency is an inherent characteristic of decentralized ledger technology.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">3. Stateless Invoice Tokens</h2>
              <p>
                RobinPay utilizes self-contained, cryptographically signed invoice tokens. When you generate an invoice, its details are encoded into the link itself rather than stored in a centralized database honeypot. No user tracking profiles are created or maintained.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">4. Ephemeral Rate Limiting &amp; Cookies</h2>
              <p>
                We do not use tracking pixels, ad cookies, or third-party behavioral profiling. When interacting with the API or dashboard:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>IP addresses are evaluated in ephemeral volatile memory solely to enforce rate limits against spam or DDoS attacks and are discarded after short rolling windows.</li>
                <li>Local storage is utilized only on the client machine to remember user theme preferences and recent transactions initiated in your browser session.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">5. Contact Regarding Privacy</h2>
              <p>
                For questions regarding data architecture or security disclosures, contact our engineering team at <code className="bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200 text-[#0A0A0A]">privacy@robinpay.xyz</code>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
