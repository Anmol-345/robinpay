import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { Terminal, Shield, ArrowRight, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'API Reference — RobinPay REST & Webhook API',
  description:
    'Complete reference for RobinPay endpoints, invoice generation, on-chain verification, event polling, and error schemas.',
};

export default function ApiReferencePage() {
  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/invoices/create',
      title: 'Create Invoice',
      description: 'Generates a signed, self-contained payment invoice token (inv_...) without writing to a database.',
      body: `{
  "merchant": "0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead",
  "amount": "49.00",
  "token": "USDC", // or "ETH"
  "description": "Pro Tier Subscription",
  "externalRef": "ORD-2026-X839",
  "expiresInMinutes": 1440
}`,
      response: `{
  "token": "inv_eyJtZXJjaGFudCI6IjB4MmFlMjVmMWMwZTY0...",
  "url": "https://robinpay.xyz/pay/inv_eyJtZXJjaGFudCI6IjB4MmFlMjVmMWMwZTY0...",
  "expiresAt": 1792434000
}`,
    },
    {
      method: 'GET',
      path: '/api/v1/invoices/:token',
      title: 'Get Invoice Details',
      description: 'Decodes and validates a cryptographic invoice token, checking signature and expiration status.',
      response: `{
  "valid": true,
  "invoice": {
    "merchant": "0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead",
    "amount": "49000000",
    "token": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "decimals": 6,
    "description": "Pro Tier Subscription",
    "externalRef": "ORD-2026-X839",
    "verified": false,
    "exp": 1792434000
  }
}`,
    },
    {
      method: 'POST',
      path: '/api/v1/checkout/verify',
      title: 'Verify Payment Transaction',
      description: 'Derives confirmation status directly from the Robinhood Chain block receipt and dispatches registered webhooks.',
      body: `{
  "token": "inv_eyJtZXJjaGFudCI6IjB4MmFlMjVmMWMwZTY0...",
  "txHash": "0x6406fc67749c72b6e261d931c071f742409acb3707c7dd7880701d5c69a04e08"
}`,
      response: `{
  "status": "PAID",
  "orderId": "ORD-2026-X839",
  "txHash": "0x6406fc67749c72b6e261d931c071f742409acb3707c7dd7880701d5c69a04e08",
  "verified": false
}`,
    },
    {
      method: 'GET',
      path: '/api/v1/events?merchant=0x...',
      title: 'Query Merchant Payment Logs',
      description: 'Returns real-time PaymentProcessed events and direct ERC20 transfers on Robinhood Chain Testnet (46630).',
      response: `{
  "events": [
    {
      "type": "PaymentProcessed",
      "blockNumber": "138212940",
      "txHash": "0x6406fc67749c72b6e261d931c071f742409acb3707c7dd7880701d5c69a04e08",
      "args": {
        "orderId": "ORD-2026-MXS9RM",
        "payer": "0x49F4AED7512120fC0690bCb4786810Ffe28c3236",
        "amount": "0.0001 ETH"
      }
    }
  ],
  "head": "138215000"
}`,
    },
    {
      method: 'POST',
      path: '/api/testnet/faucet',
      title: 'Request Testnet Tokens',
      description: 'Mints 100 Testnet USDC on Robinhood Chain Testnet to any recipient address.',
      body: `{
  "address": "0x49F4AED7512120fC0690bCb4786810Ffe28c3236",
  "token": "USDC"
}`,
      response: `{
  "success": true,
  "txHash": "0x78ab12...",
  "amount": "100.00 USDC",
  "network": "Robinhood Chain Testnet (46630)"
}`,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A] rounded-sm sketch-border text-xs mb-4 shadow-sm">
              <Terminal className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>v1 REST Specification</span>
            </div>
            <h1 className="font-caveat text-5xl sm:text-6xl text-[#0A0A0A] tracking-tight leading-none mb-4">
              API Reference
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#525252] leading-relaxed">
              Direct endpoints for invoice creation, cryptographic validation, on-chain transaction verification, and event synchronization on Robinhood Chain.
            </p>
          </div>

          {/* Endpoints List */}
          <div className="space-y-10 mb-16">
            {endpoints.map((ep, i) => (
              <div
                key={i}
                className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sm:p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]"
              >
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                      ep.method === 'POST'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#0A0A0A]">{ep.path}</span>
                </div>

                <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-1">{ep.title}</h3>
                <p className="text-xs text-[#525252] mb-6">{ep.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ep.body && (
                    <div>
                      <span className="text-[11px] font-semibold text-[#525252] block mb-1">
                        Request Body (JSON)
                      </span>
                      <pre className="bg-[#0A0A0A] text-zinc-100 p-4 rounded text-xs font-mono overflow-x-auto">
                        <code>{ep.body}</code>
                      </pre>
                    </div>
                  )}
                  <div className={ep.body ? '' : 'md:col-span-2'}>
                    <span className="text-[11px] font-semibold text-[#525252] block mb-1">
                      Response (200 OK / 201 Created)
                    </span>
                    <pre className="bg-[#0A0A0A] text-zinc-100 p-4 rounded text-xs font-mono overflow-x-auto">
                      <code>{ep.response}</code>
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Error Codes Table */}
          <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-8 sketch-border shadow-[4px_4px_0px_#0A0A0A]">
            <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-4">Error Schemas &amp; Status Codes</h2>
            <p className="text-xs text-[#525252] mb-6">
              All error responses return <code className="bg-zinc-100 px-1 border border-zinc-200">{"{ error: { code, message } }"}</code> with appropriate HTTP status codes:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b-2 border-[#0A0A0A] bg-[#FAFAFA]">
                    <th className="py-2.5 px-3 font-semibold text-[#0A0A0A]">Error Code</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0A0A0A]">HTTP Status</th>
                    <th className="py-2.5 px-3 font-semibold text-[#0A0A0A]">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0A0A0A]/10">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-red-700">INVALID_TOKEN</td>
                    <td className="py-2.5 px-3">400</td>
                    <td className="py-2.5 px-3 text-[#525252]">The invoice token has expired or the cryptographic HMAC signature failed.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-red-700">INVALID_TX</td>
                    <td className="py-2.5 px-3">400</td>
                    <td className="py-2.5 px-3 text-[#525252]">Transaction reverted or receipt not found on Robinhood Chain Testnet.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-red-700">AMOUNT_MISMATCH</td>
                    <td className="py-2.5 px-3">400</td>
                    <td className="py-2.5 px-3 text-[#525252]">The gross on-chain transferred amount is less than invoice requirement.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-red-700">RATE_LIMITED</td>
                    <td className="py-2.5 px-3">429</td>
                    <td className="py-2.5 px-3 text-[#525252]">Exceeded IP or merchant rate limit window (includes retryAfter header).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-yellow-700">PENDING</td>
                    <td className="py-2.5 px-3">202</td>
                    <td className="py-2.5 px-3 text-[#525252]">Transaction is in the mempool and awaiting required block confirmations.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
