// =============================================================================
// components/dashboard/WebhookForm.tsx — Webhook registration (keyless)
// =============================================================================
// Merchant registers a webhook by signing an EIP-712 message
// { merchant, url, events, expiry } with their wallet. The server returns a
// signed, stateless webhook config token (whc_...) that is embedded in invoice
// tokens. Webhook deliveries are signed with HKDF(MASTER_WEBHOOK_SECRET,
// merchantAddress).
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { getWalletClient } from '@/lib/chain/wallet';

interface WebhookFormProps {
  address: string;
}

export function WebhookForm({ address }: WebhookFormProps) {
  const [webhookUrl, setWebhookUrl] = React.useState('');
  const [events, setEvents] = React.useState('payment.succeeded');
  const [status, setStatus] = React.useState<'idle' | 'signing' | 'registered' | 'error'>('idle');
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const WEBHOOK_CONFIG_DOMAIN = {
    name: 'RobinPay Webhook Config',
    version: '1',
    chainId: 4663,
    verifyingContract: '0x0000000000000000000000000000000000000000',
  } as const;

  const WEBHOOK_CONFIG_TYPES = {
    WebhookConfig: [
      { name: 'merchant', type: 'address' },
      { name: 'url', type: 'string' },
      { name: 'events', type: 'string' },
      { name: 'expiry', type: 'uint64' },
    ] as const,
  };

  const handleRegister = async () => {
    setError(null);
    setStatus('signing');

    try {
      const walletClient = getWalletClient();
      if (!walletClient) throw new Error('Wallet not connected');

      const message = {
        merchant: address as `0x${string}`,
        url: webhookUrl,
        events,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
      };

      const signature = await walletClient.signTypedData({
        domain: WEBHOOK_CONFIG_DOMAIN,
        types: WEBHOOK_CONFIG_TYPES,
        primaryType: 'WebhookConfig',
        message,
        account: address as `0x${string}`,
      });

      const res = await fetch('/api/v1/webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: address,
          url: webhookUrl,
          events,
          signature,
          expiry: 30 * 24 * 60 * 60,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Webhook registration failed');
      }

      const data = await res.json();
      setToken(data.token);
      setStatus('registered');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
  };

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border">
      <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-6">Webhooks</h3>
      <p className="font-mono text-xs text-[#525252] mb-6">
        Register a webhook by signing an EIP-712 message with your wallet. The
        server returns a stateless webhook config token — embed it in invoice
        creation calls as &quot;webhookToken&quot;. Deliveries are signed with
        HMAC-SHA256 using a per-merchant secret derived from your address.
      </p>

      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 font-mono">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline underline-offset-4 hover:text-red-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block font-mono text-xs text-[#525252] mb-1">Webhook endpoint URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://api.merchant.com/webhooks/robinpay"
            className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-[#525252] mb-1">Events (comma-separated)</label>
          <input
            type="text"
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            placeholder="payment.succeeded, subscription.charged"
            className="w-full p-2 border border-[#0A0A0A]/30 rounded bg-[#FAFAFA] font-mono text-xs text-[#0A0A0A] focus:border-[#0A0A0A]"
          />
        </div>

        <Button
          variant="default"
          onClick={handleRegister}
          disabled={status === 'signing' || status === 'registered'}
          className="w-full"
        >
          {status === 'signing' ? 'Signing…' : status === 'registered' ? 'Registered ✓' : 'Register Webhook'}
        </Button>

        {token && (
          <div className="mt-4 p-4 bg-[#FAFAFA] border border-[#0A0A0A]/20 rounded">
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono text-xs text-[#525252]">Webhook config token</span>
              <Button variant="ghost" size="sm" onClick={copyToken}>
                Copy
              </Button>
            </div>
            <div className="font-mono text-xs text-[#0A0A0A] break-all truncate max-w-xs">
              {token}
            </div>
            <p className="mt-2 font-mono text-xs text-[#525252]">
              Pass as webhookToken when creating invoices. Webhooks for this
              merchant are signed with a secret derived from your wallet
              address.
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-dashed border-[#0A0A0A]/40">
        <p className="font-mono text-xs text-[#525252] mb-2">Signature verification (your server):</p>
        <code className="block mb-3 p-2 bg-[#0A0A0A] text-white rounded font-mono text-xs overflow-x-auto">
          {`const secret = hkdf(MASTER_WEBHOOK_SECRET, merchantAddress);
const expected = hmacSHA256(secret, '<timestamp>.<rawBody>');
// compare with RobinPay-Signature header v1 value`}
        </code>
        <p className="font-mono text-xs text-[#525252] mt-2">
          SSRF protected: HTTPS only, no private/loopback/link-local IPs, no
          redirects, 2KB response cap.
        </p>
      </div>
    </div>
  );
}
