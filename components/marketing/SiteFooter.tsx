import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#FAFAFA] border-t-2 border-dashed border-[#0A0A0A] pt-16 pb-12 font-mono">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-dashed border-[#0A0A0A]">
          {/* Col 1 */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
              <Image
                src="/logo.png"
                alt="RobinPay Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain rounded"
              />
              <span className="font-caveat text-3xl text-[#0A0A0A]">RobinPay</span>
            </Link>
            <p className="font-mono text-xs sm:text-sm text-[#525252] max-w-sm leading-relaxed">
              Payments, minus the middlemen. Built for developers engineering the decentralized economy on Robinhood Chain Testnet (46630).
            </p>
          </div>

          {/* Col 2: Product */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <h3 className="font-caveat text-2xl text-[#0A0A0A]">Product</h3>
            <ul className="flex flex-col gap-1.5 text-xs text-[#525252]">
              <li>
                <Link href="/checkout" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Checkout
                </Link>
              </li>
              <li>
                <Link href="/subscriptions" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Subscriptions
                </Link>
              </li>
              <li>
                <Link href="/invoices" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Invoices
                </Link>
              </li>
              <li>
                <Link href="/payroll" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Payroll
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Developers */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <h3 className="font-caveat text-2xl text-[#0A0A0A]">Developers</h3>
            <ul className="flex flex-col gap-1.5 text-xs text-[#525252]">
              <li>
                <Link href="/docs" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Docs
                </Link>
              </li>
              <li>
                <Link href="/api-reference" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  API reference
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Anmol-345/robinpay"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline hover:text-[#0A0A0A] transition-colors"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <Link href="/status" className="inline-flex items-center gap-1.5 hover:underline hover:text-[#0A0A0A] transition-colors">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  <span>Status</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Company */}
          <div className="md:col-span-3 flex flex-col gap-2">
            <h3 className="font-caveat text-2xl text-[#0A0A0A]">Company</h3>
            <ul className="flex flex-col gap-1.5 text-xs text-[#525252]">
              <li>
                <Link href="/about" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Terms &amp; Disclaimers
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:underline hover:text-[#0A0A0A] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#525252]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0A0A0A] inline-block"></span>
            <span>Built on Robinhood Chain Testnet (Chain ID 46630)</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Anmol-345/robinpay"
              target="_blank"
              rel="noreferrer"
              className="text-[#0A0A0A] hover:underline"
            >
              GitHub Repo
            </a>
            <span className="text-[#0A0A0A]/30">·</span>
            <a
              href="https://explorer.testnet.chain.robinhood.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#0A0A0A] hover:underline"
            >
              Explorer
            </a>
            <span className="text-[#0A0A0A]/30">·</span>
            <Link href="/dashboard" className="text-[#0A0A0A] hover:underline font-semibold">
              Merchant Dashboard
            </Link>
          </div>

          <p>© 2026 RobinPay Protocol. Hand-inked protocols.</p>
        </div>
      </div>
    </footer>
  );
}
