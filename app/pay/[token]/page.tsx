// =============================================================================
// app/pay/[token]/page.tsx — Public payment page (stateless, full-page)
// =============================================================================
// Full-page, non-custodial crypto checkout experience on Robinhood Chain.
// Derives order state entirely from on-chain verification and signed invoice token.
import Link from 'next/link';
import { PayButton } from '@/components/checkout/PayButton';
import { TestnetTokenHelper } from '@/components/checkout/TestnetTokenHelper';
import { OrderCopyButton } from '@/components/checkout/OrderCopyButton';
import { parseInvoiceToken, invoiceTokenToOrderId } from '@/lib/invoice/token';
import { isOrderPaid } from '@/lib/payments/status';
import { keccak256, toHex, formatUnits } from 'viem';
import { ShieldCheck, CheckCircle2, Lock, Zap, ArrowLeft, Coins, Receipt, ExternalLink } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = parseInvoiceToken(token);
  const tokenSymbol = invoice?.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC';
  let formattedAmount = invoice?.amount;
  if (invoice) {
    try {
      formattedAmount = invoice.decimals > 0
        ? formatUnits(BigInt(invoice.amount), invoice.decimals)
        : invoice.amount;
    } catch {
      formattedAmount = invoice.amount;
    }
  }
  const title = invoice ? `Pay ${formattedAmount} ${tokenSymbol} • RobinPay Checkout` : 'Payment • RobinPay';
  const description = invoice?.description
    ? `${invoice.description} — Pay ${formattedAmount} ${tokenSymbol} securely on Robinhood Chain Testnet (46630)`
    : 'Secure on-chain payment on Robinhood Chain Testnet (46630)';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: '/og.png',
          width: 1024,
          height: 1024,
          alt: 'RobinPay Checkout — Secure crypto payment on Robinhood Chain',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.png'],
    },
  };
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = parseInvoiceToken(token);

  if (!invoice) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#FAFAFA] dark:bg-[#0A0A0C] text-[#0A0A0A] dark:text-[#F4F4F5] relative">
        <div className="max-w-md w-full border-2 border-[#0A0A0A] dark:border-zinc-700 bg-white dark:bg-[#121216] rounded-2xl p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4 text-xl font-bold">
            !
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            This payment link is invalid, corrupted, or has exceeded its expiration window.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Return to RobinPay
          </Link>
        </div>
      </div>
    );
  }

  const orderId = invoiceTokenToOrderId(token);
  let paid = false;
  try {
    paid = await isOrderPaid(orderId as `0x${string}`);
  } catch {
    paid = false;
  }

  const tokenSymbol = invoice.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'USDC';
  let displayAmount: string;
  try {
    displayAmount = invoice.decimals > 0
      ? formatUnits(BigInt(invoice.amount), invoice.decimals)
      : invoice.amount;
  } catch {
    displayAmount = invoice.amount;
  }

  const explorerBaseUrl =
    process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL &&
    !process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL.includes('.example')
      ? process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL
      : 'https://explorer.testnet.chain.robinhood.com';

  // ---------------------------------------------------------------------------
  // View 1: Already Paid State (Full-Page Receipt)
  // ---------------------------------------------------------------------------
  if (paid) {
    return (
      <div
        className="min-h-screen w-full flex flex-col justify-between bg-[#FAFAFA] dark:bg-[#0A0A0C] text-[#0A0A0A] dark:text-[#F4F4F5] relative overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(120, 120, 120, 0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Top Minimal Brand Bar */}
        <header className="w-full border-b border-[#0A0A0A]/10 dark:border-white/10 bg-white/70 dark:bg-[#0E0E12]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold font-caveat text-3xl text-black dark:text-white tracking-tight">
              RobinPay
            </span>
            <span className="text-xs font-mono px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded font-semibold border border-emerald-300 dark:border-emerald-700">
              Receipt
            </span>
          </Link>
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified On-Chain</span>
          </div>
        </header>

        <main className="max-w-2xl w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
          <div className="border-2 border-[#0A0A0A] dark:border-zinc-700 bg-white dark:bg-[#121216] rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">Payment Confirmed</h1>
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Settled on Robinhood Chain Testnet (46630)
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 mb-6 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-zinc-500 dark:text-zinc-400">Description:</span>
                <span className="font-semibold text-black dark:text-white">{invoice.description || 'Invoice'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-zinc-500 dark:text-zinc-400">Amount Paid:</span>
                <span className="font-bold text-black dark:text-white text-sm">
                  {displayAmount} {tokenSymbol}
                </span>
              </div>
              {invoice.externalRef && (
                <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-zinc-500 dark:text-zinc-400">Order ID:</span>
                  <span className="font-semibold text-black dark:text-white">{invoice.externalRef}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 dark:text-zinc-400">Recipient Merchant:</span>
                <span className="font-mono text-[11px] text-black dark:text-white truncate max-w-[200px]">
                  {invoice.merchant}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="flex-1 py-2.5 px-4 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-lg text-xs font-mono font-bold text-center hover:opacity-90 transition-opacity"
              >
                Return to Home
              </Link>
              <a
                href={`${explorerBaseUrl}/address/${invoice.merchant}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#0A0A0A]/10 dark:border-white/10 py-5 text-center text-xs font-mono text-zinc-500 dark:text-zinc-400">
          Powered by RobinPay • Non-Custodial Gateway on Robinhood Chain
        </footer>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // View 2: Active Full-Page Checkout Experience
  // ---------------------------------------------------------------------------
  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between bg-[#FAFAFA] dark:bg-[#0A0A0C] text-[#0A0A0A] dark:text-[#F4F4F5] relative selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(120, 120, 120, 0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Brand Bar */}
      <header className="w-full border-b border-[#0A0A0A]/10 dark:border-white/10 bg-white/70 dark:bg-[#0E0E12]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold font-caveat text-3xl text-black dark:text-white tracking-tight group-hover:opacity-85 transition-opacity">
              RobinPay
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/80 rounded-full text-emerald-800 dark:text-emerald-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            <span>Robinhood Testnet (46630)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden md:flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Non-Custodial Direct Settlement</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
            <span className="text-[11px] truncate max-w-[120px] sm:max-w-[160px]">
              {invoice.merchant.slice(0, 6)}...{invoice.merchant.slice(-4)}
            </span>
            <OrderCopyButton text={invoice.merchant} label="Copy" />
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Checkout Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ================= LEFT COLUMN: Order Details & Guarantees (7 Cols) ================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Merchant Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-mono text-zinc-600 dark:text-zinc-300 mb-4 shadow-sm">
                <Receipt className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                <span>Verified Merchant Invoice</span>
              </div>

              <h1 className="font-caveat text-4xl sm:text-5xl text-black dark:text-white tracking-tight leading-tight mb-2">
                {invoice.description || 'On-Chain Payment'}
              </h1>

              {invoice.externalRef && (
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  <span>Order Reference:</span>
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-black dark:text-white font-semibold">
                    {invoice.externalRef}
                  </code>
                  <OrderCopyButton text={invoice.externalRef} label="Copy" />
                </div>
              )}
            </div>

            {/* Itemized Order Breakdown Card */}
            <div className="border-2 border-[#0A0A0A] dark:border-zinc-700 bg-white dark:bg-[#121216] rounded-2xl p-6 shadow-sm">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {invoice.description || 'Payment Order'}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {displayAmount} {tokenSymbol}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Protocol Service Fee</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    0.00% (Testnet Promo)
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Estimated L2 Gas</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ~0.00002 ETH (Robinhood Chain)
                  </span>
                </div>

                {/* Total Line */}
                <div className="pt-4 border-t-2 border-dashed border-zinc-200 dark:border-zinc-700 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                      Total Due
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Settles directly to merchant wallet
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white font-mono tracking-tight">
                      {displayAmount} <span className="text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400">{tokenSymbol}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Three Pillar Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-black dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Non-Custodial</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  No centralized holding. Funds go peer-to-peer into the seller's wallet.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-black dark:text-white">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Instant Finality</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Sub-second confirmation powered by Arbitrum Orbit Rollup execution.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-black dark:text-white">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Signed Invoice</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  HMAC-signed stateless token prevents price tampering or replay attacks.
                </p>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Interactive Payment Panel (5 Cols) ================= */}
          <div className="lg:col-span-5">
            <div className="border-2 border-[#0A0A0A] dark:border-zinc-700 bg-white dark:bg-[#121216] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              
              {/* Header inside Panel */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-600" />
                  <span className="font-mono text-sm font-bold text-black dark:text-white">
                    Checkout with Wallet
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                  EVM Web3
                </span>
              </div>

              {/* Amount Highlight Box */}
              <div className="mb-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                  You are paying
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-mono text-black dark:text-white">
                    {displayAmount} {tokenSymbol}
                  </span>
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Chain ID 46630
                  </span>
                </div>
              </div>

              {/* The Interactive Payment Button */}
              <div className="space-y-4">
                <PayButton
                  invoiceToken={token}
                  amount={invoice.amount}
                  merchant={invoice.merchant}
                  token={(tokenSymbol as 'USDC' | 'ETH')}
                />

                {/* Collapsible Testnet Tools & Faucet */}
                <TestnetTokenHelper tokenSymbol={(tokenSymbol as 'USDC' | 'ETH')} />
              </div>

              {/* Trust Footer Note */}
              <div className="mt-6 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                  Transactions are submitted directly to Robinhood Chain Testnet via your browser wallet.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Full Page Bottom Footer */}
      <footer className="w-full border-t border-[#0A0A0A]/10 dark:border-white/10 py-5 px-6 text-center text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-white/40 dark:bg-[#0A0A0C]/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RobinPay • Developer-First Crypto Payment Gateway on Robinhood Chain</span>
          <span>Arbitrum Orbit EVM L2 • Chain ID 46630</span>
        </div>
      </footer>
    </div>
  );
}

