import type { Metadata } from 'next';
import './globals.css';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'RobinPay — Developer-First Crypto Payment Gateway on Robinhood Chain',
    template: '%s • RobinPay',
  },
  description:
    'Accept crypto payments, subscriptions, invoices, and payroll in 5 lines of code on Robinhood Chain Testnet (46630). Zero intermediary custody.',
  keywords: [
    'RobinPay',
    'crypto payments',
    'Robinhood Chain',
    'Robinhood Chain Testnet',
    '46630',
    'USDC',
    'ETH',
    'web3 checkout',
    'payment gateway',
    'non-custodial gateway',
    'crypto subscriptions',
  ],
  authors: [{ name: 'RobinPay Team' }],
  creator: 'RobinPay',
  openGraph: {
    title: 'RobinPay — Developer-First Crypto Payment Gateway',
    description:
      'Accept crypto payments in 5 lines of code on Robinhood Chain Testnet (46630). Zero intermediary custody.',
    url: '/',
    siteName: 'RobinPay',
    images: [
      {
        url: '/og.png',
        width: 1024,
        height: 1024,
        alt: 'RobinPay — Accept crypto payments in 5 lines of code on Robinhood Chain',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RobinPay — Developer-First Crypto Payment Gateway',
    description:
      'Accept crypto payments in 5 lines of code on Robinhood Chain Testnet (46630). Zero intermediary custody.',
    images: ['/og.png'],
    creator: '@robinpay',
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
  },
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

