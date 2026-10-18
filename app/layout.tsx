import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RobinPay — Developer-First Crypto Payment Gateway',
  description: 'Accept USDC and ETH payments, subscriptions, invoices, and payroll on Robinhood Chain with sub-second finality.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col antialiased bg-[#FAFAFA] text-[#0A0A0A] font-mono selection:bg-[#0A0A0A] selection:text-[#FFFFFF]">
        {children}
      </body>
    </html>
  );
}

