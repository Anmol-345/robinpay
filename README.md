# RobinPay

Developer-first payment gateway suite on Robinhood Chain (Arbitrum Orbit EVM L2, Chain ID 4663).

This Next.js 16 App Router implementation follows [`RobinPay — Technical Architecture & Launch Package.md`](./RobinPay%20—%20Technical%20Architecture%20&%20Launch%20Package.md).

## Architecture — database-free, keyless

**The blockchain is the only source of truth.** Nothing is persisted server-side:
no Prisma, no PostgreSQL, no KV store, no file-based store. No API keys — identity
comes from wallet signatures (SIWE). All state is derived from on-chain events
or encoded in signed, stateless tokens.

| Concern | Stateless mechanism |
| --- | --- |
| Merchant identity | Wallet address via SIWE (EIP-4361) + signed httpOnly session cookie |
| Invoices | Signed `inv_<payload>.<hmac>` tokens (HMAC-SHA256, `INVOICE_SIGNING_SECRET`). `orderId = keccak256(token)`. Optional EIP-712 merchant signature marks token "verified". |
| Sessions | SIWE login → signed httpOnly `rp_session` cookie (`SESSION_SECRET`). Stateless nonces (HMAC, 5-min TTL). |
| Webhooks | Merchant signs EIP-712 `{merchant, url, events, expiry}` → stateless `whc_` token. HMAC-SHA256 (`t=...,v1=...`) with per-merchant secret via HKDF(`MASTER_WEBHOOK_SECRET`, merchant). Delivered inline; no outbox table. |
| Payment status | Derived from chain: `isOrderPaid(orderId)` + `PaymentProcessed` logs. |
| Subscriptions | Due IDs read on-chain via `getDueSubscriptions`; `claimBatch` submitted by operator. |
| Payroll | CSV validated client-side; chunks sent from user's wallet; history from `BatchExecuted`/`PayoutSent` logs. |

## Pricing

No signup. No API keys. No monthly fee. Just a small per-payment protocol fee,
configured on-chain in `PaymentRouter.protocolFeeBps` (can be set to 0).

## Routes

- `GET /` — marketing landing
- `GET /pay/[token]` — public payment page (decodes signed invoice token)
- `GET /login` — SIWE wallet login → `/dashboard`
- `GET /dashboard` — merchant dashboard (SIWE-protected)
- `POST /api/v1/invoices/create` — public. Body: `{merchant, amount, token, ...}`. Returns `{url, orderId, token, verified}`.
- `POST /api/v1/checkout/verify` — public. Body: `{token, txHash}`. Verifies receipt on-chain, fires webhook inline. Returns `{status, txHash, orderId, verified}`.
- `GET /api/v1/events?merchant=&since=&type=` — public, read-only. Pull missed on-chain events.
- `POST /api/v1/webhooks/register` — merchant signs EIP-712 webhook config → returns stateless `whc_` token.
- `POST /api/v1/payroll/batches` — public. Validate CSV + chunks for client-side wallet signing.
- `POST /api/v1/subscriptions` — public. Plan metadata helper (full plan lives on-chain).
- `POST /api/auth/nonce` — public. Returns stateless SIWE nonce for address.
- `POST /api/auth/verify` — public. Verify SIWE signature + nonce, set session cookie.
- `DELETE /api/auth/logout` — clear session cookie.
- `GET /api/auth/me` — SIWE-protected. Return authenticated merchant address.
- `GET /api/cron/process-subscriptions` — operator claimBatch cron (Vercel Cron, `CRON_SECRET`).

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
- `npm run test` — vitest (invoice tokens, nonces, EIP-712, rate limiting, SSRF, webhook signing, SIWE sessions)
