# RobinPay

Developer-first payment gateway suite on Robinhood Chain (Arbitrum Orbit EVM L2, Chain ID 4663).

This Next.js 16 App Router implementation follows [`RobinPay — Technical Architecture & Launch Package.md`](./RobinPay%20—%20Technical%20Architecture%20&%20Launch%20Package.md).

## What's implemented

**Backend / API (App Router route handlers)**
- `POST /api/v1/checkout/sessions` — short-lived pk_ checkout session
- `POST /api/v1/checkout/verify` — verify tx hash on-chain, mark invoice PAID, fire webhook
- `POST /api/v1/invoices/create` — create invoice + hosted `/pay/[id]` link
- `GET /api/v1/invoices/[id]/receipt` — PDF receipt stub
- `GET /api/v1/subscriptions` — list/create plans
- `POST /api/v1/payroll/batches` — CSV upload, validation, recipient chunking
- `POST /api/v1/webhooks/test` — send a sample signed webhook
- `GET /api/cron/process-subscriptions` — lease + claimBatch via operator key
- `GET /api/cron/retry-webhooks` — exponential-backoff webhook redelivery
- `GET /api/cron/reconcile-chain` — rescan recent blocks for missed payments

**Libraries**
- `lib/env.ts` — zod-validated env (server-only + NEXT_PUBLIC_*)
- `lib/db.ts` — Prisma singleton
- `lib/chain/{client,chains,tokens,decoders,wallet}.ts` — viem clients for Chain ID 4663
- `lib/auth/{api-keys,session,rate-limit}.ts` — pk_/sk_ key lifecycle, checkout sessions
- `lib/webhooks/{sign,dispatch}.ts` — HMAC-SHA256 signing + retry scheduling
- `lib/payments/{verify,fees}.ts` — chain-verified payment, bps fee math

**Smart contracts (`contracts/`)**
- Interfaces: `IPaymentRouter`, `ISubscriptionVault`, `IEscrowInvoice`, `IBatchPayout`
- Implementations: `PaymentRouter`, `SubscriptionVault`, `EscrowInvoice`, `BatchPayout`, `Registry`
- Shared security module: `security.sol` (AccessControl, Pausable, ReentrancyGuard)

**Database** — `prisma/schema.prisma` (Merchant, ApiKey, Invoice, Payment, Plan, Subscription, PayrollBatch, WebhookLog, CheckoutSession, WebhookEndpoint, Customer)

**Frontend**
- `app/(marketing)/page.tsx` — landing page
- `app/pay/[invoiceId]/page.tsx` — public payment page
- `app/embed/checkout/page.tsx` — iframe embed target
- `components/checkout/PayButton`, `WalletModal`, `TxStatus`

**Config** — `vercel.json` (cron schedules), `.env.example` (env template)

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in values (Chain ID 4663 RPC, contract addresses, DATABASE_URL, CRON_SECRET, OPERATOR_PRIVATE_KEY).
2. `npm install`
3. `npx prisma generate`
4. `npm run dev`
5. Open http://localhost:3000

> Chain ID 4663, RPC URLs, and stablecoin addresses must be confirmed against Robinhood Chain's official docs and kept in env (never hardcoded), since testnet and mainnet values differ.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — eslint
- `npx prisma generate` — generate Prisma client
- `npx prisma db push` — push schema to database
