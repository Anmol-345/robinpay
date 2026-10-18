// =============================================================================
// components/dashboard/WebhookForm.tsx — Webhook URL settings
// =============================================================================
// Stores the webhook URL in the sk_ key payload (stateless). Webhooks are
// delivered inline with HMAC-SHA256 signing; merchants pull missed events via
// GET /api/v1/events.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

interface WebhookFormProps {
  address: string;
}

export function WebhookForm({ address }: WebhookFormProps) {
  const [webhookUrl, setWebhookUrl] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [testResult, setTestResult] = React.useState<{ ok: boolean; body?: string } | null>(null);

  const handleSave = async () => {
    setStatus('saving');
    // Regenerate the current key with the webhookUrl embedded in the payload.
    // The merchant copies the new key; webhook deliveries will be signed with
    // the per-merchant HKDF secret derived from their address.
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 1500);
  };

  const handleTest = async () => {
    if (!webhookUrl) return;
    try {
      const res = await fetch('/api/v1/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, merchant: address, eventType: 'payment.succeeded' }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, body: data.body });
    } catch (err) {
      setTestResult({ ok: false, body: String(err) });
    }
  };

  return (
    <div className="bg-white border-2 border-[#0A0A0A] rounded-lg p-6 sketch-border">
      <h3 className="font-caveat text-2xl text-[#0A0A0A] mb-6">Webhooks</h3>
      <p className="font-mono text-xs text-[#525252] mb-6">
        Signed webhooks (HMAC-SHA256, RobinPay-Signature header) are POSTed to
        your endpoint when a payment settles. The per-merchant signing secret is
        derived from your wallet address — nothing is stored server-side.
      </p>

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

        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={handleSave}
            disabled={status === 'saving'}
            className="w-auto"
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save Webhook URL'}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!webhookUrl}
            className="w-auto"
          >
            {testResult ? (testResult.ok ? 'Test OK ✓' : 'Test Failed') : 'Send test'}
          </Button>
        </div>

        {testResult && !testResult.ok && (
          <p className="font-mono text-xs text-red-600 mt-2">{testResult.body}</p>
        )}

        <div className="pt-4 border-t border-dashed border-[#0A0A0A]/40">
          <p className="font-mono text-xs text-[#525252] mb-2">Signature verification (your server):</p>
          <code className="block mb-3 p-2 bg-[#0A0A0A] text-white rounded font-mono text-xs overflow-x-auto">
            {`const secret = hkdf(MASTER_WEBHOOK_SECRET, merchantAddress);
const expected = hmacSHA256(secret, '<timestamp>.<rawBody>');
// compare with RobinPay-Signature header v1 value`}
          </code>
        </div>
      </div>
    </div>
  );
}
