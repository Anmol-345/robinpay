'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  User,
  ArrowRight,
  PlayCircle,
  Lock,
  Wallet,
  CheckCircle2,
  Terminal,
  Coins,
  ShieldCheck,
  Webhook,
  Zap,
  Code2,
  Code,
  Copy,
  Check,
  Menu,
  X,
  Percent,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { WalletConnectModal } from '@/components/auth/WalletConnectModal';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function MarketingPage() {
  const router = useRouter();

  // Wallet Connection & Auth State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [merchantAddress, setMerchantAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if merchant already has an active SIWE session
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.address) {
          setMerchantAddress(data.address);
        }
      })
      .catch(() => {});
  }, []);

  const handleGetApiKey = () => {
    if (merchantAddress) {
      router.push('/dashboard');
    } else {
      setIsWalletModalOpen(true);
    }
  };

  // Interactive Checkout Demo State
  const [demoState, setDemoState] = useState<'idle' | 'signing' | 'broadcasting' | 'confirmed'>('idle');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<'checkout' | 'subscriptions' | 'invoices' | 'payroll'>('checkout');

  const triggerDemo = () => {
    if (demoState !== 'idle' && demoState !== 'confirmed') return;
    setDemoState('signing');
    setTimeout(() => {
      setDemoState('broadcasting');
      setTimeout(() => {
        setDemoState('confirmed');
      }, 600);
    }, 500);
  };

  const resetDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDemoState('idle');
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInstall = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const moduleCodeSnippets = {
    checkout: `import { RobinPayButton } from '@robinpay/sdk';

export function Checkout() {
  return (
    <RobinPayButton
      publicKey="pk_live_8f92a..."
      amount="49.00"
      token="USDC"
      onSuccess={(tx) => console.log(tx.hash)}
    />
  );
}`,
    subscriptions: `import { RobinPaySubscriptions } from '@robinpay/sdk';

export async function createPlan() {
  return await RobinPaySubscriptions.createPlan({
    planId: "pro_monthly",
    amount: "29.00",
    interval: "month",
    token: "USDC" // On-chain cap
  });
}`,
    invoices: `import { RobinPayInvoices } from '@robinpay/sdk';

export async function createInvoice() {
  return await RobinPayInvoices.create({
    recipient: "0x71C...439",
    amount: "1500.00",
    token: "USDC",
    escrow: true,
    milestones: 3
  });
}`,
    payroll: `import { RobinPayPayroll } from '@robinpay/sdk';

export async function batchDisburse(recipients) {
  // Pay 200+ team members in 1 L2 tx
  return await RobinPayPayroll.batchPay({
    token: "USDC",
    allocations: recipients
  });
}`,
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/95 backdrop-blur-sm border-b-2 border-dashed border-[#0A0A0A]">
        <div className="h-[72px] max-w-[1100px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-caveat text-3xl md:text-4xl text-[#0A0A0A] tracking-tight hover:opacity-85 transition-opacity"
            >
              RobinPay
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a
              href="#how-it-works"
              className="text-[#0A0A0A] hover:underline decoration-[#0A0A0A] underline-offset-4 transition-all"
            >
              How it works
            </a>
            <a
              href="#modules"
              className="text-[#0A0A0A] hover:underline decoration-[#0A0A0A] underline-offset-4 transition-all"
            >
              Modules
            </a>
            <a
              href="#features"
              className="text-[#0A0A0A] hover:underline decoration-[#0A0A0A] underline-offset-4 transition-all"
            >
              Why RobinPay
            </a>
            <a
              href="https://github.com/Anmol-345/robinpay"
              target="_blank"
              rel="noreferrer"
              className="text-[#0A0A0A] hover:underline decoration-[#0A0A0A] underline-offset-4 transition-all"
            >
              GitHub
            </a>
          </nav>

          {/* Nav Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGetApiKey}
              className="sketch-btn sketch-border px-4 py-1.5 bg-white text-[#0A0A0A] border-2 border-[#0A0A0A] font-mono text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-pointer"
            >
              {merchantAddress ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Dashboard ({merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)})</span>
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
            <button
              onClick={handleGetApiKey}
              title={merchantAddress ? `Merchant Dashboard (${merchantAddress})` : 'Connect Wallet to view Dashboard'}
              className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center cursor-pointer relative hover:opacity-85 transition-opacity"
            >
              <User className="w-4 h-4 text-white" />
              {merchantAddress && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </button>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1 text-[#0A0A0A] cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-dashed border-[#0A0A0A] bg-[#FAFAFA] px-6 py-4 flex flex-col gap-3 font-mono text-sm">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:underline py-1"
            >
              How it works
            </a>
            <a
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:underline py-1"
            >
              Modules
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:underline py-1"
            >
              Why RobinPay
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:underline py-1"
            >
              GitHub
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleGetApiKey();
              }}
              className="sketch-btn sketch-border px-4 py-2 bg-[#0A0A0A] text-white font-mono text-xs text-center flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {merchantAddress ? (
                <span>View Dashboard ({merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)})</span>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet &amp; Get API Key</span>
                </>
              )}
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full pt-[72px] min-h-[calc(100vh-72px)] flex flex-col">
        {/* HERO SECTION */}
        <section className="w-full py-12 lg:py-20">
          <div className="max-w-[1100px] mx-auto px-6 lg:px-12 flex flex-col items-center">
            {/* Top Doodle Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-[#0A0A0A] sketch-border -rotate-1 mb-6 sketch-btn">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A] inline-block animate-ping"></span>
              <span className="font-mono text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
                Robinhood Chain Testnet (Chain ID 46630)
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-caveat text-4xl sm:text-6xl md:text-7xl text-[#0A0A0A] text-center max-w-4xl tracking-tight leading-tight">
              Accept crypto payments in{' '}
              <span className="relative inline-block whitespace-nowrap">
                5 lines
                <svg
                  className="absolute -bottom-2 md:-bottom-3 left-0 w-full overflow-visible pointer-events-none"
                  height="12"
                  preserveAspectRatio="none"
                  viewBox="0 0 120 14"
                >
                  <path
                    d="M3 9 Q 30 2, 60 8 T 116 5"
                    fill="none"
                    stroke="#0A0A0A"
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></path>
                </svg>
              </span>{' '}
              of code.
            </h1>

            {/* Subheadline */}
            <p className="font-mono text-base sm:text-lg text-[#525252] text-center mt-5 max-w-2xl leading-relaxed">
              Checkout, subscriptions, invoices, and payroll. Direct on-chain settlement with zero intermediary custody.
            </p>

            {/* CTA Buttons Row */}
            <div className="relative flex flex-wrap items-center justify-center gap-4 mt-8 mb-14">
              {/* Primary Button */}
              <a
                href="#how-it-works"
                className="sketch-btn sketch-border px-8 py-3.5 bg-[#0A0A0A] text-white font-caveat text-2xl border-2 border-[#0A0A0A] inline-flex items-center gap-2"
              >
                <span>Start building</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </a>

              {/* Secondary Button */}
              <a
                href="#demo"
                className="sketch-btn sketch-border-alt px-8 py-3.5 bg-white text-[#0A0A0A] font-caveat text-2xl border-2 border-[#0A0A0A] inline-flex items-center gap-2"
              >
                <PlayCircle className="w-6 h-6 text-[#0A0A0A]" />
                <span>Interactive demo</span>
              </a>

              {/* Floating Hand Annotation */}
              <div className="hidden md:flex absolute -right-36 -top-4 items-center gap-1.5 rotate-6 pointer-events-none">
                <svg
                  className="w-8 h-8 text-[#0A0A0A] -scale-x-100 -rotate-12"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 40 40"
                >
                  <path d="M 32 30 C 26 18, 16 12, 6 22"></path>
                  <path d="M 12 16 L 6 22 L 14 26"></path>
                </svg>
                <span className="font-caveat text-xl text-[#525252] whitespace-nowrap">
                  Takes 2 minutes!
                </span>
              </div>
            </div>

            {/* Split Hero Demo Layout (Browser Mockup + Code Snippet) */}
            <div
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2"
              id="demo"
            >
              {/* Left: Sketched Browser Window */}
              <div className="lg:col-span-6 bg-white border-2 border-[#0A0A0A] p-6 flex flex-col justify-between -rotate-1 sketch-border shadow-sm">
                <div>
                  {/* Window Header */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#0A0A0A] mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] bg-transparent inline-block"></span>
                      <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] bg-transparent inline-block"></span>
                      <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] bg-transparent inline-block"></span>
                    </div>
                    <span className="font-mono text-xs text-[#525252] px-2 py-0.5 border border-[#0A0A0A]/40 rounded-sm">
                      demo-store.xyz/checkout
                    </span>
                    <Lock className="w-4 h-4 text-[#0A0A0A]" />
                  </div>

                  {/* Item & Order Box */}
                  <div className="border-2 border-[#0A0A0A] p-4 rounded-sm bg-[#FAFAFA] mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-caveat text-2xl text-[#0A0A0A] leading-tight">
                          Dev Membership Pass
                        </div>
                        <div className="font-mono text-xs text-[#525252]">Robinhood Chain L2 Access</div>
                      </div>
                      <div className="text-right">
                        <div className="font-caveat text-2xl text-[#0A0A0A]">49.00 USDC</div>
                        <div className="font-mono text-xs text-[#525252]">Gas: &lt;$0.001</div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Checkout Action Flow */}
                  <div className="flex flex-col gap-3 items-center my-4">
                    <button
                      onClick={triggerDemo}
                      disabled={demoState === 'signing' || demoState === 'broadcasting'}
                      className={`w-full sketch-btn sketch-border py-3 px-4 border-2 border-[#0A0A0A] flex items-center justify-center gap-2 font-caveat text-2xl cursor-pointer ${
                        demoState === 'confirmed'
                          ? 'bg-white text-[#0A0A0A]'
                          : 'bg-[#0A0A0A] text-white'
                      }`}
                    >
                      {demoState === 'confirmed' ? (
                        <CheckCircle2 className="w-6 h-6 text-[#0A0A0A]" />
                      ) : (
                        <Wallet className="w-6 h-6" />
                      )}
                      <span>
                        {demoState === 'idle' && 'Pay 49 USDC'}
                        {demoState === 'signing' && 'Signing with wallet...'}
                        {demoState === 'broadcasting' && 'Broadcasting to L2...'}
                        {demoState === 'confirmed' && 'Payment Complete ✓'}
                      </span>
                    </button>

                    {/* Step 1: Wallet Signature Doodle */}
                    <div className="w-full flex items-center justify-center gap-2 py-1">
                      <svg
                        className={`w-5 h-5 text-[#0A0A0A] ${demoState === 'signing' ? 'animate-bounce' : 'animate-pulse'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 4v16m0 0l-4-4m4 4l4-4" strokeDasharray="3 3"></path>
                      </svg>
                      <span className="font-caveat text-lg text-[#0A0A0A]">
                        {demoState === 'signing' ? 'Awaiting wallet authorization...' : 'Sign & Send from Wallet'}
                      </span>
                    </div>

                    {/* Step 2: Confirmation Sketched Badge */}
                    <div
                      className={`w-full p-3 border-2 border-dashed border-[#0A0A0A] flex items-center justify-between gap-2 rounded-sm transition-all duration-300 ${
                        demoState === 'confirmed' ? 'bg-[#FAFAFA]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#0A0A0A] flex-shrink-0" />
                        <span className="font-mono text-xs sm:text-sm text-[#0A0A0A] font-medium">
                          {demoState === 'confirmed'
                            ? 'Confirmed in 0.38s! Hash: 0x9f1a...4bc2'
                            : 'Confirmed in 0.4s on Robinhood Chain'}
                        </span>
                      </div>
                      {demoState === 'confirmed' && (
                        <button
                          onClick={resetDemo}
                          className="text-xs font-mono underline hover:text-[#525252] cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Micro Details */}
                <div className="pt-3 border-t border-dashed border-[#0A0A0A]/60 flex items-center justify-between font-mono text-xs text-[#525252]">
                  <span>Tx: 0x8a9f...3e01</span>
                  <span>Block #4,891,204</span>
                </div>
              </div>

              {/* Right: Code Snippet Card */}
              <div className="lg:col-span-6 bg-white border-2 border-[#0A0A0A] p-6 flex flex-col justify-between rotate-1 sketch-border-alt shadow-sm">
                <div>
                  {/* Code Window Chrome */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#0A0A0A] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] inline-block bg-[#0A0A0A]"></span>
                      <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] inline-block"></span>
                      <span className="w-3 h-3 rounded-full border-2 border-[#0A0A0A] inline-block"></span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#0A0A0A]">
                      {activeModule}.tsx
                    </span>
                    <button
                      onClick={() => copyCode(moduleCodeSnippets[activeModule])}
                      className="font-mono text-xs text-[#0A0A0A] hover:underline uppercase font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Monospaced Code Block */}
                  <pre className="font-mono text-[11px] sm:text-[11.5px] lg:text-[12px] text-[#0A0A0A] leading-relaxed overflow-x-auto p-3.5 sm:p-4 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded-sm min-h-[220px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <code>{moduleCodeSnippets[activeModule]}</code>
                  </pre>
                </div>

                {/* SDK Footnote Stamp */}
                <div className="mt-4 pt-3 border-t border-dashed border-[#0A0A0A]/60 flex items-center justify-between">
                  <span className="font-mono text-xs text-[#525252]">npm i @robinpay/sdk</span>
                  <div className="flex items-center gap-1.5 font-caveat text-lg text-[#0A0A0A]">
                    <span>TypeScript Ready</span>
                    <CheckCircle2 className="w-4 h-4 text-[#0A0A0A]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section
          className="w-full py-16 lg:py-24 border-t-2 border-dashed border-[#0A0A0A] bg-[#FAFAFA]"
          id="how-it-works"
        >
          <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
            {/* Section Title & Squiggle */}
            <div className="text-center mb-16">
              <h2 className="relative inline-block font-caveat text-4xl sm:text-5xl md:text-6xl text-[#0A0A0A] tracking-tight">
                How it works
                <svg
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-48 overflow-visible pointer-events-none"
                  fill="none"
                  viewBox="0 0 160 12"
                >
                  <path
                    d="M4 6 Q 40 12, 80 6 T 156 7"
                    stroke="#0A0A0A"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  ></path>
                </svg>
              </h2>
              <p className="font-mono text-base text-[#525252] mt-4 max-w-xl mx-auto">
                Direct on-chain settlement with zero intermediary custody.
              </p>
            </div>

            {/* 4 Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {/* Step 1: Create */}
              <div className="bg-white border-2 border-[#0A0A0A] p-6 flex flex-col justify-between -rotate-1 sketch-border relative group hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center font-caveat text-2xl text-[#0A0A0A] bg-[#FAFAFA]">
                      1
                    </div>
                    <Terminal className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Create</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Generate an invoice or checkout session with one simple API call.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252]">
                  POST /v1/charges
                </div>
              </div>

              {/* Step 2: Pay */}
              <div className="bg-white border-2 border-[#0A0A0A] p-6 flex flex-col justify-between rotate-1 sketch-border-alt relative group hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center font-caveat text-2xl text-[#0A0A0A] bg-[#FAFAFA]">
                      2
                    </div>
                    <Coins className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Pay</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Customer signs & pays directly from any wallet in seconds.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252]">
                  USDC, ETH, WBTC
                </div>
              </div>

              {/* Step 3: Verify */}
              <div className="bg-white border-2 border-[#0A0A0A] p-6 flex flex-col justify-between -rotate-1 sketch-border relative group hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center font-caveat text-2xl text-[#0A0A0A] bg-[#FAFAFA]">
                      3
                    </div>
                    <ShieldCheck className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Verify</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Transaction confirms on-chain in real-time without centralized escrow.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252]">
                  0.4s finality
                </div>
              </div>

              {/* Step 4: Get notified */}
              <div className="bg-white border-2 border-[#0A0A0A] p-6 flex flex-col justify-between rotate-1 sketch-border-alt relative group hover:-translate-y-1 transition-transform">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center font-caveat text-2xl text-[#0A0A0A] bg-[#FAFAFA]">
                      4
                    </div>
                    <Webhook className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Get notified</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Cryptographically signed webhooks hit your server instantly.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252]">
                  event: payment.succeeded
                </div>
              </div>
            </div>

            {/* Module Selector Badges */}
            <div
              className="mt-16 pt-8 border-t border-dashed border-[#0A0A0A] flex flex-col md:flex-row items-center justify-between gap-4"
              id="modules"
            >
              <div className="font-caveat text-2xl text-[#0A0A0A] flex items-center gap-2">
                <span>Select module preview:</span>
                <ArrowRight className="w-5 h-5 text-[#0A0A0A] hidden sm:block" />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {(['checkout', 'subscriptions', 'invoices', 'payroll'] as const).map((mod) => {
                  const label =
                    mod === 'checkout'
                      ? 'Checkout'
                      : mod === 'subscriptions'
                      ? 'Subscriptions'
                      : mod === 'invoices'
                      ? 'Invoices & Escrow'
                      : 'Payroll';
                  const isSelected = activeModule === mod;
                  return (
                    <button
                      key={mod}
                      onClick={() => setActiveModule(mod)}
                      className={`sketch-btn px-4 py-2 border-2 border-[#0A0A0A] font-mono text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        mod === 'subscriptions' || mod === 'payroll'
                          ? 'sketch-border-alt'
                          : 'sketch-border'
                      } ${
                        isSelected
                          ? 'bg-[#0A0A0A] text-white shadow-[2px_2px_0px_#525252]'
                          : 'bg-white text-[#0A0A0A]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* DEVELOPER FEATURES / WHY ROBINPAY GRID */}
        <section
          className="w-full py-16 lg:py-24 border-t-2 border-dashed border-[#0A0A0A] bg-white"
          id="features"
        >
          <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
            <div className="text-center mb-16">
              <h2 className="font-caveat text-4xl sm:text-5xl md:text-6xl text-[#0A0A0A] tracking-tight">
                Why developers pick RobinPay
              </h2>
              <p className="font-mono text-base text-[#525252] mt-3 max-w-xl mx-auto">
                Built for clarity, speed, and clean terminal workflows.
              </p>
            </div>

            {/* 3 Sketchy Notebook Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Fee */}
              <div className="p-8 bg-[#FAFAFA] border-2 border-[#0A0A0A] sketch-border -rotate-1 flex flex-col justify-between sketch-btn">
                <div>
                  <div className="w-12 h-12 mb-4 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center bg-white font-caveat text-3xl text-[#0A0A0A]">
                    <Percent className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">No signup. No API keys.</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Just connect your wallet and start accepting payments. No monthly minimums, no
                    hidden basis points, no foreign exchange markups.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252] flex items-center justify-between">
                  <span>Card rails: ~3.5%</span>
                  <span className="font-bold text-[#0A0A0A]">RobinPay: protocol fee on-chain</span>
                </div>
              </div>

              {/* Feature 2: L2 Native */}
              <div className="p-8 bg-[#FAFAFA] border-2 border-[#0A0A0A] rotate-1 sketch-border-alt flex flex-col justify-between sketch-btn">
                <div>
                  <div className="w-12 h-12 mb-4 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center bg-white">
                    <Zap className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Robinhood Chain Testnet Native</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Sub-second block confirmation with fractional cent gas fees.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252] flex items-center justify-between">
                  <span>Latency</span>
                  <span className="font-bold text-[#0A0A0A]">~400ms avg</span>
                </div>
              </div>

              {/* Feature 3: Webhooks & SDKs */}
              <div className="p-8 bg-[#FAFAFA] border-2 border-[#0A0A0A] sketch-border -rotate-1 flex flex-col justify-between sketch-btn">
                <div>
                  <div className="w-12 h-12 mb-4 border-2 border-[#0A0A0A] rounded-full flex items-center justify-center bg-white">
                    <Code2 className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <h3 className="font-caveat text-3xl text-[#0A0A0A] mb-2">Webhooks &amp; SDKs</h3>
                  <p className="font-mono text-xs sm:text-sm text-[#525252] leading-relaxed">
                    Ready-to-use TypeScript, React, and server-side verification tooling.
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252] flex items-center justify-between">
                  <span>CI/CD verified</span>
                  <span className="font-bold text-[#0A0A0A]">v2.4.0 live</span>
                </div>
              </div>
            </div>

            {/* Quick Interactive Terminal Card */}
            <div className="mt-12 bg-[#FAFAFA] border-2 border-[#0A0A0A] p-6 sketch-border">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <span className="font-caveat text-2xl text-[#0A0A0A] whitespace-nowrap">
                    Install package:
                  </span>
                  <code className="px-4 py-2 bg-white border-2 border-[#0A0A0A] font-mono text-xs sm:text-sm text-[#0A0A0A] sketch-border select-all">
                    npm install @robinpay/sdk
                  </code>
                  <button
                    onClick={() => copyInstall('npm install @robinpay/sdk')}
                    className="font-mono text-xs text-[#0A0A0A] underline hover:text-[#525252] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedInstall ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href="#demo"
                  className="sketch-btn sketch-border px-6 py-2 bg-[#0A0A0A] text-white font-caveat text-xl border-2 border-[#0A0A0A] flex items-center gap-2"
                >
                  <span>Test in Sandbox</span>
                  <Code className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <SiteFooter />

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}


