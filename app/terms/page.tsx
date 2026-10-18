import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { ShieldAlert, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service & Disclaimers — RobinPay',
  description:
    'Terms of service, protocol risk disclosures, and non-custodial disclaimers for using RobinPay on Robinhood Chain.',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[900px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <FileText className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>Legal &middot; Updated October 2026</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-4">
              Terms &amp; Disclaimers
            </h1>
            <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
              Please read these terms carefully before deploying or interacting with RobinPay software, SDKs, or on-chain contracts.
            </p>
          </div>

          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sm:p-10 sketch-border shadow-[4px_4px_0px_#0A0A0A] space-y-8 text-xs sm:text-sm text-[#525252] leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">1. Non-Custodial Protocol Architecture</h2>
              <p>
                RobinPay is decentralized, open-source software that facilitates peer-to-peer payment routing on Robinhood Chain. RobinPay does not operate as a bank, financial institution, money transmitter, custodian, or escrow agent.
              </p>
              <p>
                At no point does RobinPay or its contributors have access to, control over, or custody of your private cryptographic keys, digital assets, or customer funds. All payments settle directly from the payer’s wallet address to the merchant’s designated recipient address on the blockchain.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">2. Smart Contract &amp; Network Risks</h2>
              <p>
                Interacting with blockchain systems involves inherent risks, including but not limited to smart contract vulnerabilities, network forks, unexpected reorgs, RPC node latency, and market volatility. While RobinPay contracts are engineered with safety, formal validation, and immutability in mind, software is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">3. Testnet Environment Usage</h2>
              <p>
                RobinPay is deployed on the Robinhood Chain Testnet (Chain ID 46630). Testnet tokens—including testnet ETH and testnet USDC—are strictly for simulation, testing, and development purposes and hold zero financial or monetary value. No real-world currency is exchanged in testnet transactions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">4. Merchant Responsibilities</h2>
              <p>
                Merchants integrating RobinPay are solely responsible for ensuring that their commercial activities comply with all applicable local and international laws, regulations, and tax reporting requirements in their respective jurisdictions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-caveat text-2xl text-[#0A0A0A]">5. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, the RobinPay protocol contributors, developers, and affiliated entities shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from the use of, or inability to use, the protocol, smart contracts, or SDKs.
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
