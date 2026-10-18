// =============================================================================
// app/login/page.tsx — SIWE login page (connect wallet to get API keys)
// =============================================================================
// Merchant connects a wallet, signs a SIWE message, and receives an httpOnly
// session cookie. Redirects to /dashboard on success.
'use client';

import { SIWELogin } from '@/components/auth/SIWELogin';

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center py-20 px-4 bg-[#FAFAFA]">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 mb-8">
          <span className="font-caveat text-3xl text-[#0A0A0A]">RobinPay</span>
          <span className="font-mono text-xs text-[#525252] px-2 py-0.5 border border-[#0A0A0A]/40 rounded-sm">
            Merchant login
          </span>
        </div>

        <h2 className="font-caveat text-3xl text-[#0A0A0A] mb-2 text-center">Connect wallet</h2>
        <p className="font-mono text-xs text-[#525252] text-center mb-8">
          Sign in with Ethereum to access your merchant dashboard and API keys.
        </p>

        <SIWELogin />

        <p className="mt-8 font-mono text-xs text-[#525252] text-center">
          No wallet?{' '}
          <a href="https://metamask.io/download" className="text-[#0A0A0A] underline hover:text-[#525252]">
            Install MetaMask
          </a>
        </p>
      </div>
    </div>
  );
}
