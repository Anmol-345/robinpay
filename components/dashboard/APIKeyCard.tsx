// =============================================================================
// components/dashboard/APIKeyCard.tsx — Generate and display API keys
// =============================================================================
// Uses createSecretKey (pure, stateless) client-side. Keys are never stored;
// the merchant copies them once. Supports test (sk_test_) and live (sk_live_).
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { createSecretKey } from '@/lib/auth/stateless';

interface APIKeyCardProps {
  address: string;
}

export function APIKeyCard({ address }: APIKeyCardProps) {
  const [testKey, setTestKey] = React.useState<string | null>(null);
  const [liveKey, setLiveKey] = React.useState<string | null>(null);
  const [copying, setCopying] = React.useState<'test' | 'live' | null>(null);

  const env = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ? 'test' : 'live';

  const generateKey = (kind: 'test' | 'live') => {
    const key = createSecretKey(address, kind);
    if (kind === 'test') setTestKey(key);
    else setLiveKey(key);
  };

  const copyKey = async (key: string, kind: 'test' | 'live') => {
    await navigator.clipboard.writeText(key);
    setCopying(kind);
    setTimeout(() => setCopying(null), 1500);
  };

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-1">API Keys</h3>
          <p className="font-mono text-xs text-[#525252]">
            Self-signed keys — copy once, never stored server-side.
          </p>
        </div>
        <span className={`font-mono text-xs px-2 py-0.5 rounded ${
          env === 'test' ? 'bg-zinc-100 text-zinc-600' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {env === 'test' ? 'TEST MODE' : 'LIVE MODE'}
        </span>
      </div>

      <div className="space-y-4">
        <div className="p-4 border border-[#0A0A0A]/20 rounded bg-[#FAFAFA]">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-xs text-[#525252]">sk_test_ (testnet)</span>
            {copying === 'test' ? (
              <span className="font-mono text-xs text-emerald-600">Copied!</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm break-all text-[#0A0A0A] truncate max-w-[200px]">
              {testKey ?? '••••••••••••••••'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateKey('test')}
              disabled={!!testKey}
            >
              {testKey ? 'Regenerate' : 'Generate'}
            </Button>
            {testKey && (
              <Button variant="ghost" size="sm" onClick={() => copyKey(testKey, 'test')}>
                {copying === 'test' ? '✓' : 'Copy'}
              </Button>
            )}
          </div>
          {testKey && (
            <p className="mt-2 font-mono text-xs text-[#525252]">
              Use with: Authorization: Bearer {testKey}
            </p>
          )}
        </div>

        <div className="p-4 border border-[#0A0A0A]/20 rounded bg-[#FAFAFA]">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-xs text-[#525252]">sk_live_ (mainnet)</span>
            {copying === 'live' ? (
              <span className="font-mono text-xs text-emerald-600">Copied!</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm break-all text-[#0A0A0A] truncate max-w-[200px]">
              {liveKey ?? '••••••••••••••••'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateKey('live')}
              disabled={!!liveKey}
            >
              {liveKey ? 'Regenerate' : 'Generate'}
            </Button>
            {liveKey && (
              <Button variant="ghost" size="sm" onClick={() => copyKey(liveKey, 'live')}>
                {copying === 'live' ? '✓' : 'Copy'}
              </Button>
            )}
          </div>
          {liveKey && (
            <p className="mt-2 font-mono text-xs text-[#525252]">
              Use with: Authorization: Bearer {liveKey}
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-dashed border-[#0A0A0A]/40 font-mono text-xs text-[#525252]">
          <p className="mb-2">How to use:</p>
          <code className="block mb-2 p-2 bg-[#0A0A0A] text-white rounded font-mono text-xs">
            {`curl -X POST ${process.env.NEXT_PUBLIC_APP_URL}/api/v1/invoices/create \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"amount":"49.00","token":"USDC"}'`}
          </code>
        </div>
      </div>
    </div>
  );
}
