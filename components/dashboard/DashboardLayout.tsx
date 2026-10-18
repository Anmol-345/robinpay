'use client';

import * as React from 'react';
import Link from 'next/link';
import { APIKeyCard } from '@/components/dashboard/APIKeyCard';
import { InvoiceForm } from '@/components/dashboard/InvoiceForm';
import { WebhookForm } from '@/components/dashboard/WebhookForm';
import { EventFeed } from '@/components/dashboard/EventFeed';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Key, FileText, Webhook, Activity, ArrowLeft, User } from 'lucide-react';

interface DashboardLayoutProps {
  address: string;
}

export function DashboardLayout({ address }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = React.useState<'keys' | 'invoices' | 'webhooks' | 'events'>('keys');

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-mono">
      {/* Header */}
      <header className="border-b-2 border-dashed border-[#0A0A0A] bg-[#FAFAFA]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#525252] hover:text-[#0A0A0A] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <div className="h-4 w-[1px] bg-[#0A0A0A]/20" />
            <Link href="/" className="font-caveat text-3xl text-[#0A0A0A] tracking-tight hover:opacity-85">
              RobinPay
            </Link>
            <span className="font-mono text-xs text-[#525252] px-2 py-0.5 border border-[#0A0A0A]/40 rounded-sm sketch-border">
              Merchant Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-[#0A0A0A]/30 rounded-sm sketch-border">
              <div className="w-6 h-6 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-mono text-xs text-[#0A0A0A] font-semibold hidden sm:inline">Merchant:</span>
              <span className="font-mono text-xs text-[#525252] truncate max-w-[160px] sm:max-w-[220px]">
                {address}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1100px] w-full mx-auto px-6 py-10 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-dashed border-[#0A0A0A]/30 pb-4">
          {[
            { id: 'keys', label: 'API Keys', icon: Key },
            { id: 'invoices', label: 'Create Invoice', icon: FileText },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            { id: 'events', label: 'Event Log', icon: Activity },
          ].map(({ id, label, icon: Icon }) => {
            const isSelected = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`sketch-btn font-mono text-xs sm:text-sm px-4 py-2 border-2 border-[#0A0A0A] flex items-center gap-2 cursor-pointer transition-all ${
                  id === 'invoices' || id === 'events' ? 'sketch-border-alt' : 'sketch-border'
                } ${
                  isSelected
                    ? 'bg-[#0A0A0A] text-white shadow-[2px_2px_0px_#525252]'
                    : 'bg-white text-[#0A0A0A] hover:bg-[#FAFAFA]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="w-full">
          {activeTab === 'keys' && <APIKeyCard address={address} />}
          {activeTab === 'invoices' && <InvoiceForm />}
          {activeTab === 'webhooks' && <WebhookForm address={address} />}
          {activeTab === 'events' && <EventFeed />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dashed border-[#0A0A0A]/30 py-6 text-center text-xs text-[#525252]">
        Robinhood Chain (Chain ID 4663) • Non-Custodial Merchant Protocol
      </footer>
    </div>
  );
}
