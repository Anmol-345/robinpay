'use client';

import * as React from 'react';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Mail, MessageSquare, ExternalLink, CheckCircle2, ShieldCheck, Code2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [category, setCategory] = React.useState('integration');
  const [message, setMessage] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <Mail className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>Developer Support &middot; Community</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-4">
              Contact RobinPay
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed">
              Have questions about integrating the SDK on Robinhood Chain, security disclosures, or partnership inquiries? We’re here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Form Column */}
            <div className="md:col-span-7">
              <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-caveat text-3xl text-[#0A0A0A]">Message Transmitted!</h3>
                    <p className="text-xs text-[#525252] max-w-sm mx-auto">
                      Thank you, <span className="font-bold text-[#0A0A0A]">{name}</span>. Our engineering team has received your message and will respond to <span className="font-bold text-[#0A0A0A]">{email}</span> within 24 hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="sketch-btn sketch-border px-4 py-2 bg-[#0A0A0A] text-white text-xs font-semibold"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Inquiry Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] text-xs font-mono focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="integration">Developer &amp; SDK Integration</option>
                        <option value="enterprise">Enterprise / High-Volume Processing</option>
                        <option value="security">Vulnerability Disclosure / Bug Bounty</option>
                        <option value="general">General Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0A0A0A] mb-1">Message</label>
                      <textarea
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us about your project or what you are building on Robinhood Chain..."
                        className="w-full p-2.5 border-2 border-[#0A0A0A] rounded bg-[#FAFAFA] text-xs font-mono focus:bg-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="sketch-btn sketch-border w-full py-3 bg-[#0A0A0A] text-white hover:bg-black font-semibold text-xs shadow-[2px_2px_0px_#525252] cursor-pointer"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Support Links Column */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
                <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-4">Direct Channels</h3>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <Code2 className="w-4 h-4 text-[#0A0A0A] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0A0A0A] block">GitHub Repository</span>
                      <a
                        href="https://github.com/Anmol-345/robinpay"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline flex items-center gap-1"
                      >
                        <span>github.com/Anmol-345/robinpay</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#0A0A0A] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0A0A0A] block">Email Inquiries</span>
                      <p className="text-[#525252]">support@robinpay.xyz</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-[#0A0A0A] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0A0A0A] block">Security &amp; Audits</span>
                      <p className="text-[#525252]">security@robinpay.xyz</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFAFA] border border-dashed border-[#0A0A0A]/30 rounded-lg p-6 text-xs text-[#525252] space-y-2">
                <span className="font-bold text-[#0A0A0A] block font-caveat text-xl">Testnet Support Note</span>
                <p>
                  RobinPay is currently operational on Robinhood Chain Testnet (Chain ID 46630). For testnet ETH or USDC requests, you can also use the self-serve faucet directly inside the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
