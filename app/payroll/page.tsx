import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { ArrowRight, Users, Zap, FileSpreadsheet, CheckCircle2, ShieldCheck, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payroll — Batch Crypto Payouts & Global Salaries on Robinhood Chain',
  description:
    'Pay global contributors, contractors, and employees in USDC and ETH with a single transaction via BatchPayout on Robinhood Chain.',
};

export default function PayrollPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Hero */}
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Product &middot; Batch Disbursements</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-6">
              Batch Web3 Payroll. <br />
              <span className="underline decoration-wavy decoration-[#0A0A0A]/40">One Click. Hundreds of Recipients.</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed mb-8">
              Pay remote software engineers, DAO contributors, and global contractors across the world in seconds. RobinPay’s <code className="bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300">BatchPayout.sol</code> aggregates hundreds of individual salary transfers into a single optimized smart contract execution on Robinhood Chain.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="sketch-btn sketch-border px-6 py-3 bg-[#0A0A0A] text-white hover:bg-black text-sm font-semibold flex items-center gap-2 shadow-[3px_3px_0px_#525252]"
              >
                <span>Launch Payroll Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="sketch-btn sketch-border-alt px-6 py-3 bg-white text-[#0A0A0A] hover:bg-[#FAFAFA] border-2 border-[#0A0A0A] text-sm font-semibold flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                <span>Batch Payout SDK</span>
              </Link>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] flex items-center justify-center text-white mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">CSV Upload Support</h3>
              <p className="font-mono text-xs text-[#525252] leading-relaxed">
                Export payroll from Deel, Rippling, or Excel and drop the CSV directly into RobinPay to automatically stage disbursements.
              </p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] flex items-center justify-center text-white mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">80% Gas Reduction</h3>
              <p className="font-mono text-xs text-[#525252] leading-relaxed">
                Execute loops in a single rollup calldata block, drastically lowering total L2 gas costs per recipient.
              </p>
            </div>

            <div className="bg-white border-2 border-[#0A0A0A] p-6 rounded-lg sketch-border shadow-[4px_4px_0px_#0A0A0A]">
              <div className="w-10 h-10 rounded bg-[#0A0A0A] flex items-center justify-center text-white mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-2">Atomic All-or-Nothing</h3>
              <p className="font-mono text-xs text-[#525252] leading-relaxed">
                Transactions either execute completely for all team members or revert safely. No partial payouts or manual reconciliation.
              </p>
            </div>
          </div>

          {/* SDK Code Example */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Programmatic Payouts via SDK</h2>
            <p className="font-mono text-xs text-[#525252] mb-6">
              Automate contractor payroll with scheduled cron jobs or backend server scripts:
            </p>

            <div className="bg-[#0A0A0A] text-zinc-100 rounded p-5 overflow-x-auto text-xs leading-relaxed font-mono">
              <pre><code>{`import { RobinPayClient } from '@robinpay/sdk';

const client = new RobinPayClient();

// Batch distribute salaries in testnet USDC on Robinhood Chain
const txHash = await client.payroll.disburseBatch({
  token: 'USDC',
  recipients: [
    { address: '0x49F4AED7512120fC0690bCb4786810Ffe28c3236', amount: '3500.00' },
    { address: '0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead', amount: '4200.00' },
    { address: '0x71c836643f37711fa49b560ab993466170ce6439', amount: '2800.00' },
  ],
});

console.log('Payroll batch settled! Tx:', txHash);`}</code></pre>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
