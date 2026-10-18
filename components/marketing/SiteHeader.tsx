'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, ArrowRight, Menu, X, Coins } from 'lucide-react';

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/95 backdrop-blur-sm border-b-2 border-dashed border-[#0A0A0A]">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-12 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
          <Image
            src="/logo.png"
            alt="RobinPay Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded"
          />
          <span className="font-caveat text-3xl text-[#0A0A0A] tracking-tight">RobinPay</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-[#0A0A0A]">
          <Link href="/checkout" className="hover:underline underline-offset-4 transition-all">
            Checkout
          </Link>
          <Link href="/subscriptions" className="hover:underline underline-offset-4 transition-all">
            Subscriptions
          </Link>
          <Link href="/invoices" className="hover:underline underline-offset-4 transition-all">
            Invoices
          </Link>
          <Link href="/payroll" className="hover:underline underline-offset-4 transition-all">
            Payroll
          </Link>
          <Link href="/docs" className="hover:underline underline-offset-4 transition-all">
            Docs
          </Link>
          <Link href="/api-reference" className="hover:underline underline-offset-4 transition-all">
            API
          </Link>
          <a
            href="https://github.com/Anmol-345/robinpay"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:underline underline-offset-4 transition-all text-[#525252] hover:text-[#0A0A0A]"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="sketch-btn sketch-border px-4 py-2 bg-[#0A0A0A] text-white hover:bg-black font-mono text-xs font-semibold flex items-center gap-1.5 shadow-[2px_2px_0px_#525252]"
          >
            <span>Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#0A0A0A] border border-[#0A0A0A] rounded cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAFAFA] border-b-2 border-[#0A0A0A] px-6 py-4 font-mono text-xs space-y-3">
          <Link
            href="/checkout"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            Checkout
          </Link>
          <Link
            href="/subscriptions"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            Subscriptions
          </Link>
          <Link
            href="/invoices"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            Invoices
          </Link>
          <Link
            href="/payroll"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            Payroll
          </Link>
          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            Documentation
          </Link>
          <Link
            href="/api-reference"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            API Reference
          </Link>
          <Link
            href="/status"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1 hover:underline text-[#0A0A0A]"
          >
            System Status
          </Link>
          <div className="pt-2 border-t border-[#0A0A0A]/20 flex justify-between items-center">
            <a
              href="https://github.com/Anmol-345/robinpay"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#525252]"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
