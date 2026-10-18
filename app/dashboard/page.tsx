// =============================================================================
// app/dashboard/page.tsx — Merchant dashboard (SIWE-protected)
// =============================================================================
// Shows authenticated merchant's wallet address, API keys, invoice creation,
// and webhook settings. Redirects to /login if no session.
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import * as React from 'react';
import { verifySession } from '@/lib/auth/siwe';
import { APIKeyCard } from '@/components/dashboard/APIKeyCard';
import { InvoiceForm } from '@/components/dashboard/InvoiceForm';
import { WebhookForm } from '@/components/dashboard/WebhookForm';
import { EventFeed } from '@/components/dashboard/EventFeed';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('rp_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono">
      <DashboardLayout address={session.address} />
    </div>
  );
}

function DashboardLayout({ address }: { address: string }) {
  const [activeTab, setActiveTab] = React.useState<'keys' | 'invoices' | 'webhooks' | 'events'>('keys');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b-2 border-dashed border-[#0A0A0A] bg-[#FAFAFA]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-caveat text-2xl text-[#0A0A0A] tracking-tight">RobinPay</span>
            <span className="font-mono text-xs text-[#525252] px-2 py-0.5 border border-[#0A0A0A]/40 rounded-sm">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#0A0A0A]">Merchant</span>
              <span className="font-mono text-xs text-[#525252] truncate max-w-xs break-all">{address}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="flex gap-1 mb-8 border-b border-dashed border-[#0A0A0A]/40 pb-4">
          {(['keys', 'invoices', 'webhooks', 'events'] as const).map((tabId) => {
            const labels: Record<string, string> = {
              keys: 'API Keys',
              invoices: 'Create Invoice',
              webhooks: 'Webhooks',
              events: 'Events',
            };
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`font-mono text-sm px-3 py-2 border-b-2 ${
                  activeTab === tabId
                    ? 'border-[#0A0A0A] text-[#0A0A0A] font-bold'
                    : 'border-transparent text-[#525252] hover:text-[#0A0A0A]'
                }`}
              >
                {labels[tabId]}
              </button>
            );
          })}
        </div>

        {activeTab === 'keys' && <APIKeyCard address={address} />}
        {activeTab === 'invoices' && <InvoiceForm />}
        {activeTab === 'webhooks' && <WebhookForm address={address} />}
        {activeTab === 'events' && <EventFeed />}
      </div>
    </div>
  );
}
