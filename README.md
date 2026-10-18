# RobinPay

Developer-first payment gateway suite on Robinhood Chain (Arbitrum Orbit EVM L2, Chain ID 4663).

This Next.js 16 App Router implementation follows [`RobinPay — Technical Architecture & Launch Package.md`](./RobinPay%20—%20Technical%20Architecture%20&%20Launch%20Package.md).

## Architecture — database-free

**The blockchain is the only source of truth.** Nothing is persisted server-side:
no Prisma, no PostgreSQL, no KV store, no file-based store. All state is derived
from on-chain events or encoded in signed, stateless tokens.

| Concern | Stateless mechanism |
| --- | --- |
| Invoices | Signed `inv_<payload>.<hmac>` tokens (HMAC-SHA256, `INVOICE_SIGNING_SECRET`). `orderId = keccak256(token)`. |
| API keys | Self-validating `sk_<env>_<payload>.<hmac>` keys (HMAC-SHA256, `API_KEY_SIGNING_SECRET`); revocation via `MIN_KEY_VERSION`. |
| Sessions | SIWE login → signed httpOnly `rp_session` cookie (`SESSION_SECRET`). |
| Webhooks | HMAC-SHA256 (`t=...,v1=...`) with per-merchant secret via HKDF(`MASTER_WEBHOOK_SECRET`, merchant). Delivered inline; no outbox table. |
| Payment status | Derived from chain: `isOrderPaid(orderId)` + `PaymentProcessed` logs. |
| Subscriptions | Due IDs read on-chain via `getDueSubscriptions`; `claimBatch` submitted by operator. |
| Payroll | CSV validated client-side; chunks sent from user's wallet; history from `BatchExecuted`/`PayoutSent` logs. |

**Routes**
- `GET /` — marketing landing
- `GET /pay/[token]` — public payment page (decodes signed invoice token)
- `POST /api/v1/invoices/create` — signed invoice token → `{ url, orderId, token }`
- `POST /api/v1/checkout/verify` — verify receipt + event, fire webhook inline, return `{ status, txHash }`
- `POST /api/auth/session` — SIWE login (sets httpOnly cookie); `DELETE` to logout
- `GET /api/v1/events?since=&type=` — pull missed on-chain events for a merchant
- `POST /api/v1/payroll/batches` — validate CSV + chunks for client-side wallet signing
- `GET /api/cron/process-subscriptions` — operator claimBatch cron (Vercel Cron)

**Config** — `.env.example` (no `DATABASE_URL`; all secrets in env). **Smart contracts** — `contracts/` (PaymentRouter, SubscriptionVault with `getDueSubscriptions`, EscrowInvoice, BatchPayout, Registry, security module).

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in values (Chain ID 4663 RPC, contract addresses, signing secrets).
2. `npm install`
3. `npm run dev`
4. Open http://localhost:3000

> Chain ID 4663, RPC URLs, and stablecoin addresses must be confirmed against Robinhood Chain's official docs and kept in env (never hardcoded), since testnet and mainnet values differ.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — eslint
- `npm run test` — vitest (stateless auth / invoice / session / webhook modules)
