<p align="center">
  <a href="https://github.com/Anmol-345/robinpay">
    <img src="./public/logo.png" alt="RobinPay Logo" width="160" height="160" style="border-radius: 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.25);" />
  </a>
</p>

<h1 align="center">RobinPay</h1>

<p align="center">
  <strong>The Non-Custodial, Database-Free Payment Gateway Suite for Robinhood Chain</strong>
</p>

<p align="center">
  <a href="https://github.com/Anmol-345/robinpay/actions"><img src="https://img.shields.io/badge/Build-Passing-22c55e?style=flat-square&logo=github" alt="Build" /></a>
  <a href="https://github.com/Anmol-345/robinpay"><img src="https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://github.com/Anmol-345/robinpay"><img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity" alt="Solidity" /></a>
  <a href="https://explorer.testnet.chain.robinhood.com/address/0x2DAD3b477A8be77cB5a880704a64f72C7f11b144"><img src="https://img.shields.io/badge/Robinhood_Chain-46630-00C805?style=flat-square&logo=ethereum" alt="Chain 46630" /></a>
  <a href="https://github.com/Anmol-345/robinpay/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License MIT" /></a>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-smart-contract-deployment">Smart Contract</a> •
  <a href="#-stateless-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-api--sdk-integration">API & SDK</a> •
  <a href="#-testing">Testing</a>
</p>

---

## 💡 Overview

**RobinPay** is an enterprise-grade, developer-first crypto payment processor built for the **Robinhood Chain** (Arbitrum Orbit L2, Chain ID `46630`).

Unlike traditional web3 payment rails that require centralized PostgreSQL databases, AWS keys, or custodial custody vaults, **RobinPay is 100% database-free and keyless**:
- **The blockchain is the single source of truth.**
- Merchant identity is authenticated purely via **Sign-In with Ethereum (SIWE / EIP-4361)**.
- Invoices are encoded in cryptographic **stateless HMAC-SHA256 tokens** verified on-chain.
- Webhook endpoints sign and decrypt payloads using **HKDF-derived merchant secrets**.
- Eliminates database leaks, data breaches, and custodial liability.

---

## ⚡ 4 Core Payment Modules

```
                           ┌──────────────────────────────────────────────┐
                           │          RobinPay Unified Contract           │
                           │  0x2DAD3b477A8be77cB5a880704a64f72C7f11b144 │
                           └──────────────────────┬───────────────────────┘
                                                  │
         ┌──────────────────┬─────────────────────┴──────────────────┬──────────────────┐
         │                  │                                        │                  │
         ▼                  ▼                                        ▼                  ▼
┌──────────────────┐ ┌─────────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
│ 1. PaymentRouter │ │  2. SubscriptionVault   │ │  3. EscrowInvoice    │ │   4. BatchPayout    │
│  Instant QR/URL  │ │  EIP-712 pre-approved   │ │  Milestone-based     │ │  Atomic multi-send  │
│  fee auto-splits │ │  recurring debit engine │ │  dispute resolution  │ │  disbursements      │
└──────────────────┘ └─────────────────────────┘ └──────────────────────┘ └─────────────────────┘
```

1. **Instant Checkout (`PaymentRouter`)**:
   - Native ETH & ERC-20 payment routing with on-chain order deduplication (`isOrderPaid`).
   - Automated real-time fee splits between merchant payout addresses and protocol treasury.
   - Hosted payment pages (`/pay/[token]`) and lightweight drop-in embed checkout iframe (`/embed/checkout`).

2. **Recurring Subscriptions (`SubscriptionVault`)**:
   - Web3-native recurring pull payments powered by **EIP-712 pre-approved permits**.
   - Interval-based debit scheduling with configurable grace periods, max charge caps, and automated worker claim executions.

3. **Milestone Escrow (`EscrowInvoice`)**:
   - Phased client invoice settlements holding funds safely in smart contract custody until verifiable project milestones are approved.
   - Built-in arbiter dispute resolution mechanism for freelance, agency, and B2B agreements.

4. **Batch Payroll (`BatchPayout`)**:
   - Gas-optimized multi-recipient mass payouts executed in a single atomic transaction.
   - Instant client-side CSV validation and chunking supporting up to 200 recipients per batch.

---

## 📜 Smart Contract Deployment

The protocol runs on an all-in-one consolidated smart contract engineered for strict **EIP-170 code size limit (<24.5 KB)** compliance using Solidity custom errors and consolidated internal routing.

| Property | Details |
| :--- | :--- |
| **Network** | **Robinhood Chain Testnet** |
| **Chain ID** | `46630` (`0xb626`) |
| **RPC Endpoint** | `https://rpc.testnet.chain.robinhood.com` |
| **Block Explorer** | [explorer.testnet.chain.robinhood.com](https://explorer.testnet.chain.robinhood.com) |
| **Contract Address** | [`0x2DAD3b477A8be77cB5a880704a64f72C7f11b144`](https://explorer.testnet.chain.robinhood.com/address/0x2DAD3b477A8be77cB5a880704a64f72C7f11b144) |
| **Contract Source** | [`contracts/RobinPay.sol`](./contracts/RobinPay.sol) |
| **Testnet USDC** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

---

## 🔒 Stateless Architecture

| Responsibility | Traditional Rails | RobinPay Stateless Engine |
| :--- | :--- | :--- |
| **Merchant Auth** | Database Passwords / API Keys | **SIWE (EIP-4361)** + signed `httpOnly` session cookies |
| **Invoice Storage** | PostgreSQL / Stripe Tables | **Stateless signed tokens** (`inv_<payload>.<hmac>`) |
| **Webhook Delivery** | Outbox Queue Tables + Redis | **Stateless EIP-712 config tokens** + inline verified receipts |
| **Webhook Secrets** | Encrypted DB columns | **HKDF-SHA256(`MASTER_WEBHOOK_SECRET`, merchantAddress)** |
| **Order Settlement** | Webhook polling loops | **Direct on-chain receipt verification** (`isOrderPaid`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or 20.x
- MetaMask, Rabby, or any EVM Web3 Wallet configured for Robinhood Chain Testnet

### 1. Clone & Install
```bash
git clone https://github.com/Anmol-345/robinpay.git
cd robinpay
npm install
```

### 2. Configure Environment
RobinPay comes pre-configured with the live Robinhood Chain Testnet contract. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 💻 API & SDK Integration

### 1. Create a Stateless Invoice
```bash
curl -X POST https://robinpay.vercel.app/api/v1/invoices/create \
  -H "Content-Type: application/json" \
  -d '{
    "merchant": "0xYourMerchantWalletAddress",
    "amount": "25.00",
    "token": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "title": "Pro Monthly Plan",
    "redirectUrl": "https://yourapp.com/checkout/success"
  }'
```

**Response**:
```json
{
  "orderId": "0x78ab...91f2",
  "token": "inv_eyJhbGciOi...",
  "url": "https://robinpay.vercel.app/pay/inv_eyJhbGciOi...",
  "verified": true
}
```

### 2. Embeddable Pay Button (HTML / React)
```html
<iframe
  src="https://robinpay.vercel.app/embed/checkout?token=inv_YOUR_TOKEN"
  width="420"
  height="580"
  frameborder="0"
  style="border-radius: 16px; border: 1px solid #e2e8f0;"
></iframe>
```

---

## 🧪 Testing & Verification

The suite includes 35 comprehensive Vitest tests verifying SSRF protection, HMAC tokens, SIWE cryptographic authentication, and rate limiting:

```bash
# Run test suite
npm test

# Run TypeScript type check
npx tsc --noEmit

# Production build check
npm run build
```

---

## 📦 Project Structure

```
robinpay/
├── app/                        # Next.js 16 App Router pages
│   ├── (marketing)/            # About, Terms, Privacy, Status, Docs
│   ├── api/                    # Stateless API endpoints (Auth, Invoices, Webhooks)
│   ├── checkout/               # Hosted checkout demo & integration playground
│   ├── dashboard/              # SIWE merchant portal & analytics
│   ├── embed/                  # Embeddable checkout widget
│   └── pay/[token]/            # Public customer settlement page
├── components/                 # React UI components (Sketch design system)
├── contracts/
│   ├── RobinPay.sol            # Unified all-in-one smart contract
│   └── README.md               # 1-minute deployment guide
├── lib/                        # Web3, Viem, EIP-712, HMAC & SSRF primitives
├── public/
│   ├── logo.png                # Brand Logo
│   └── og.png                  # OpenGraph banner
└── .env.production             # 1-click Vercel deployment variables
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

<p align="center">
  Built with ❤️ for <strong>Robinhood Chain</strong>
</p>
