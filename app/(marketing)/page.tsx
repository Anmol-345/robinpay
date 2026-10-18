// =============================================================================
// app/(marketing)/page.tsx — RobinPay marketing landing page
// ==========================================================================
import Link from 'next/link';
import { PayButton } from '@/components/checkout/PayButton';

export default function MarketingPage() {
  return (
    <div className="flex flex-col min-h-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-black dark:text-white tracking-tight">RobinPay</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pay/demo" className="hidden sm:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white">
              Try demo
            </Link>
            <Link href="#" className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200">Get API keys</Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
          Payments on Robinhood Chain,{' '}
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
            built for developers
          </span>
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
          Non-custodial checkout, recurring subscriptions, escrow invoices, and
          batch payroll — settled on-chain in seconds, with signed webhooks to
          your backend. Chain ID 4663.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="#"
            className="px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-md shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Read the docs
          </Link>
          <PayButton publicKey="pk_test_demo" amount="49.00" token="USDC" />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <h2 className="text-2xl font-bold mb-8 text-left">Four modules, one integration</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-2">1. Checkout</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">5-line integration. Instant USDC/ETH settlement. Signed webhooks on payment.</p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-2">2. Subscriptions</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pull-payment vault with on-chain allowance caps — the operator cannot overcharge.</p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-2">3. Invoices &amp; Escrow</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Hosted payment links, PDF receipts, milestone escrow with arbiter disputes.</p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-2">4. Payroll</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pay 200+ recipients in one transaction. Bounded batch inputs for gas safety.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            RobinPay v1.0 — Non-custodial payment gateway on Robinhood Chain.
          </p>
          <div className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <a href="#" className="hover:text-zinc-900 dark:hover:text-white">Docs</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-white">API Reference</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-white">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
