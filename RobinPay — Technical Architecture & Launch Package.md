# RobinPay — Technical Architecture & Launch Package

*Developer-first payment gateway suite on Robinhood Chain (Arbitrum Orbit EVM L2). Version 1.0 draft.*

> **Before you build:** Chain ID `4663`, RPC URLs, and stablecoin addresses are taken from your brief. Confirm them against Robinhood Chain's official docs and keep them in env config (never hardcoded), since testnet and mainnet values differ.

---

## Section 1: System Architecture & Folder Layout

### 1.1 Interaction Flow

```
+-----------------------+  SDK / embed  +------------------------------+
| Merchant Site /       |<------------->| Next.js Frontend             |
| Customer Browser      |               | (RSC, /checkout, /pay/[id])  |
| (wagmi + viem wallet) |               +--------------+---------------+
+-----------+-----------+                              |
            | (1) sign + broadcast tx                  | (3) fetch / Server Actions
            v                                          v
+-----------------------+  (4) viem     +------------------------------+
| Robinhood Chain RPC   |<--------------| Next.js Route Handlers       |
| Alchemy / QuickNode   |  reads/writes | /api/v1/*   /api/cron/*      |
| Chain ID 4663         |               +--------------+---------------+
+-----------+-----------+                              |
            ^                                          | (5) Prisma
            | (2) tx mined, events emitted             v
            |                          +------------------------------+
            +--------------------------| PostgreSQL (Supabase / Neon) |
                                       +--------------+---------------+
                                                      | (6) outbox -> webhook worker
                                                      v
                                       +------------------------------+
                                       | Merchant Backend             |
                                       | HMAC-SHA256 signed POST      |
                                       +------------------------------+
```

**Flow, step by step**

1. The customer connects a wallet and signs `PaymentRouter.pay(...)` (or a subscription or escrow call).
2. The tx is mined on Robinhood Chain and the contract emits an event.
3. The frontend submits the tx hash to `POST /api/v1/checkout/verify`.
4. The route handler loads the receipt with `viem`, decodes the logs, and checks them against the DB record (amount, token, merchant, orderId).
5. Prisma marks the invoice `PAID` and writes a `WebhookLog` row in the same DB transaction.
6. A dispatcher signs and POSTs the event to the merchant. Failures are retried with exponential backoff by a cron.

**Design principles**

- **Chain is the source of truth for money; the DB is the source of truth for intent.** Never mark anything paid without a verified receipt.
- **Idempotency everywhere.** `orderId` is unique on-chain, and `(txHash, logIndex)` is unique in the DB.
- **Non-custodial by default.** The router splits funds in the same tx, so RobinPay never holds merchant funds. Only the subscription operator key has any delegated power, and that power is bounded by on-chain plan limits.
- **Confirmations policy.** Wait for the finality level you choose (for example 1 L2 block for low-value items, more for high-value) before firing webhooks.

### 1.2 Project Directory Structure (Next.js 14 App Router)

```
robinpay/
├── app/
│   ├── (marketing)/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── checkout/        # Module 1: sessions, API keys, webhooks UI
│   │   ├── subscriptions/   # Module 2: plans, subscribers, charge history
│   │   ├── invoices/        # Module 3: create, list, escrow status
│   │   └── payroll/         # Module 4: CSV upload, batch review, history
│   ├── pay/[invoiceId]/page.tsx        # public payment page (RSC + client wallet UI)
│   ├── embed/checkout/page.tsx         # iframe target for the drop-in SDK
│   └── api/
│       ├── v1/
│       │   ├── checkout/
│       │   │   ├── sessions/route.ts   # POST create session
│       │   │   └── verify/route.ts     # POST verify tx hash
│       │   ├── invoices/
│       │   │   ├── create/route.ts
│       │   │   └── [id]/receipt/route.ts   # PDF receipt
│       │   ├── subscriptions/route.ts
│       │   ├── payroll/batches/route.ts
│       │   └── webhooks/test/route.ts
│       └── cron/
│           ├── process-subscriptions/route.ts
│           ├── retry-webhooks/route.ts
│           └── reconcile-chain/route.ts
├── components/
│   ├── checkout/            # PayButton, WalletModal, TxStatus
│   ├── invoices/ payroll/ subscriptions/
│   └── ui/                  # design-system primitives
├── lib/
│   ├── chain/               # client.ts, chains.ts, abis/, decoders.ts
│   ├── auth/                # api-keys.ts, session.ts, rate-limit.ts
│   ├── webhooks/            # sign.ts, dispatch.ts
│   ├── payments/            # verify.ts, fees.ts
│   ├── pdf/receipt.tsx
│   ├── db.ts                # Prisma singleton
│   └── env.ts               # zod-validated env
├── contracts/
│   ├── interfaces/          # IPaymentRouter, ISubscriptionVault, IEscrowInvoice, IBatchPayout
│   ├── PaymentRouter.sol
│   ├── SubscriptionVault.sol
│   ├── EscrowInvoice.sol
│   └── BatchPayout.sol
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── packages/sdk/            # @robinpay/checkout (React + vanilla embed.js)
├── scripts/                 # deploy.ts, verify.ts, seed.ts
├── test/                    # Foundry/Hardhat tests + Playwright e2e
├── hardhat.config.ts        # or foundry.toml
├── vercel.json              # cron schedule
└── .env.example
```

---

## Section 2: Smart Contract Architecture (Solidity)

### 2.1 Shared Design Decisions

| Concern | Decision |
| --- | --- |
| Solidity | `^0.8.24`, OpenZeppelin v5 (`SafeERC20`, `ReentrancyGuard`, `Pausable`, `AccessControl`) |
| Assets | Allowlisted ERC-20 stablecoins plus native ETH (`address(0)`) |
| Fees | Basis points (`uint16`), hard-capped (for example 500 = 5%), computed and split atomically |
| Upgradeability | Immutable core contracts. Ship new versions and migrate through a registry, since payment contracts should be hard to rug |
| Roles | `DEFAULT_ADMIN` (multisig + timelock), `OPERATOR` (cron signer, subscription claims only), `ARBITER` (escrow disputes), `PAUSER` |
| Safety | Checks-effects-interactions, reentrancy guards, custom errors, no unbounded loops except bounded batch inputs |
| Fee-on-transfer tokens | Not supported. Measure balance deltas or reject such tokens on the allowlist |

### 2.2 `interfaces/IPaymentRouter.sol`

Handles standard checkout. It pulls funds from the payer, splits the protocol fee and merchant net in one tx, and records the `orderId` so a payment can never be replayed.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPaymentRouter {
    // ---------- Errors ----------
    error InvalidAmount();
    error TokenNotAllowed(address token);
    error MerchantNotActive(address merchant);
    error OrderAlreadyPaid(bytes32 orderId);
    error FeeTooHigh(uint16 bps);
    error NativeTransferFailed();

    // ---------- Events ----------
    event MerchantRegistered(address indexed merchant, address payout);
    event PayoutUpdated(address indexed merchant, address payout);
    event PaymentProcessed(
        bytes32 indexed orderId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 gross,
        uint256 fee,
        uint256 net,
        bytes32 metadataHash
    );
    event ProtocolFeeUpdated(uint16 oldBps, uint16 newBps);
    event FeeRecipientUpdated(address indexed recipient);
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event MerchantFeeOverrideSet(address indexed merchant, uint16 bps);

    // ---------- Payments ----------
    /// @notice Pay an order with an allowlisted ERC-20 (requires prior approve).
    function pay(
        bytes32 orderId,
        address merchant,
        address token,
        uint256 amount,
        bytes32 metadataHash
    ) external;

    /// @notice Single-tx payment using EIP-2612 permit.
    function payWithPermit(
        bytes32 orderId,
        address merchant,
        address token,
        uint256 amount,
        bytes32 metadataHash,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Pay an order in native ETH.
    function payNative(
        bytes32 orderId,
        address merchant,
        bytes32 metadataHash
    ) external payable;

    // ---------- Merchant admin ----------
    function registerMerchant(address payout) external;
    function updatePayout(address payout) external;

    // ---------- Protocol admin ----------
    function setProtocolFeeBps(uint16 bps) external;
    function setMerchantFeeOverride(address merchant, uint16 bps) external;
    function setFeeRecipient(address recipient) external;
    function setTokenAllowed(address token, bool allowed) external;
    function pause() external;
    function unpause() external;

    // ---------- Views ----------
    function isOrderPaid(bytes32 orderId) external view returns (bool);
    function protocolFeeBps() external view returns (uint16);
    function payoutOf(address merchant) external view returns (address);
    function quote(address merchant, uint256 amount)
        external
        view
        returns (uint256 fee, uint256 net);
}
```

### 2.3 `interfaces/ISubscriptionVault.sol`

Pull-payment model. A subscriber approves an ERC-20 allowance to the vault and subscribes to a merchant plan. The `OPERATOR` (your cron signer) may call `claim`, but the vault enforces on-chain that each claim equals the plan price, is not early, and stays within the subscriber's cap. A compromised operator key therefore cannot over-charge.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISubscriptionVault {
    enum Status { Active, Paused, Cancelled, PastDue }

    struct Plan {
        address merchant;
        address token;
        uint256 amount;        // per cycle, token base units
        uint32  interval;      // seconds (e.g. 30 days)
        uint32  trialPeriod;   // seconds, 0 = none
        uint16  maxRetries;    // failed-claim tolerance before PastDue
        bool    active;
    }

    struct Subscription {
        uint256 planId;
        address subscriber;
        uint64  nextChargeAt;
        uint32  chargesMade;
        uint32  maxCharges;    // 0 = unlimited
        uint16  failedAttempts;
        uint256 lifetimeCap;   // subscriber-set ceiling in base units, 0 = none
        uint256 totalCharged;
        Status  status;
    }

    // ---------- Errors ----------
    error PlanInactive(uint256 planId);
    error NotDue(uint256 subId, uint64 nextChargeAt);
    error NotSubscriber();
    error NotMerchant();
    error CapExceeded(uint256 subId);
    error InvalidStatus(uint256 subId, Status status);
    error InsufficientAllowance(uint256 required, uint256 current);

    // ---------- Events ----------
    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint256 amount, uint32 interval);
    event PlanDeactivated(uint256 indexed planId);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint64 firstChargeAt);
    event Charged(uint256 indexed subId, uint256 amount, uint256 fee, uint64 nextChargeAt);
    event ChargeFailed(uint256 indexed subId, uint16 failedAttempts, bytes4 reason);
    event StatusChanged(uint256 indexed subId, Status status);

    // ---------- Merchant ----------
    function createPlan(
        address token,
        uint256 amount,
        uint32 interval,
        uint32 trialPeriod,
        uint16 maxRetries
    ) external returns (uint256 planId);
    function deactivatePlan(uint256 planId) external;

    // ---------- Subscriber ----------
    function subscribe(uint256 planId, uint32 maxCharges, uint256 lifetimeCap)
        external
        returns (uint256 subId);
    function pause(uint256 subId) external;
    function resume(uint256 subId) external;
    function cancel(uint256 subId) external;

    // ---------- Operator (cron signer) ----------
    /// @notice Never reverts on insufficient funds/allowance; emits ChargeFailed instead
    /// so a batch call cannot be blocked by one bad subscriber.
    function claim(uint256 subId) external returns (bool success);
    function claimBatch(uint256[] calldata subIds)
        external
        returns (bool[] memory results);

    // ---------- Views ----------
    function getPlan(uint256 planId) external view returns (Plan memory);
    function getSubscription(uint256 subId) external view returns (Subscription memory);
    function isDue(uint256 subId) external view returns (bool);
}
```

### 2.4 `interfaces/IEscrowInvoice.sol`

Milestone-based escrow. The payer funds once, funds unlock per milestone on client release, and either party can open a dispute that an `ARBITER` settles. An auto-release deadline protects the payee from a client who disappears.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEscrowInvoice {
    enum EscrowState { Created, Funded, InDispute, Completed, Refunded, Cancelled }
    enum MilestoneState { Locked, Released, Disputed, Refunded }

    struct Milestone {
        uint256 amount;
        uint64  releaseDeadline;   // payee may auto-release after this if undisputed
        MilestoneState state;
    }

    struct Escrow {
        bytes32 invoiceId;
        address payer;
        address payee;
        address token;             // address(0) = native
        uint256 total;
        uint256 released;
        EscrowState state;
    }

    // ---------- Errors ----------
    error NotPayer();
    error NotPayee();
    error NotArbiter();
    error InvalidState(EscrowState state);
    error InvalidMilestone(uint256 index);
    error DeadlineNotReached(uint64 deadline);
    error AmountMismatch(uint256 expected, uint256 provided);

    // ---------- Events ----------
    event EscrowCreated(uint256 indexed escrowId, bytes32 indexed invoiceId, address indexed payee, address token, uint256 total);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer, uint256 amount);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed index, uint256 payout, uint256 fee);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed index, address indexed openedBy, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed index, uint256 toPayee, uint256 toPayer);
    event EscrowCancelled(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);

    // ---------- Lifecycle ----------
    function createEscrow(
        bytes32 invoiceId,
        address payee,
        address token,
        uint256[] calldata milestoneAmounts,
        uint64[] calldata releaseDeadlines
    ) external returns (uint256 escrowId);

    /// @notice Payer funds the full escrow (ERC-20 pull, or msg.value for native).
    function fund(uint256 escrowId) external payable;

    /// @notice Payer releases a milestone to the payee (minus protocol fee).
    function releaseMilestone(uint256 escrowId, uint256 index) external;

    /// @notice Payee claims a milestone after releaseDeadline if no dispute is open.
    function autoRelease(uint256 escrowId, uint256 index) external;

    // ---------- Disputes ----------
    function openDispute(uint256 escrowId, uint256 index, bytes32 evidenceHash) external;
    function resolveDispute(uint256 escrowId, uint256 index, uint256 toPayee, uint256 toPayer) external;

    // ---------- Cancellation ----------
    function cancelUnfunded(uint256 escrowId) external;
    function refundRemaining(uint256 escrowId) external; // mutual or arbiter-approved

    // ---------- Views ----------
    function getEscrow(uint256 escrowId) external view returns (Escrow memory);
    function getMilestone(uint256 escrowId, uint256 index) external view returns (Milestone memory);
    function milestoneCount(uint256 escrowId) external view returns (uint256);
}
```

### 2.5 `interfaces/IBatchPayout.sol`

One transaction pays many wallets. Inputs are bounded (`MAX_RECIPIENTS`) to stay safe within the L2 gas limit. The contract checks that the sum of amounts equals the funded total and emits one event per batch plus per-recipient events for indexers.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBatchPayout {
    // ---------- Errors ----------
    error LengthMismatch();
    error EmptyBatch();
    error TooManyRecipients(uint256 provided, uint256 max);
    error ZeroAddressRecipient(uint256 index);
    error TotalMismatch(uint256 expected, uint256 provided);
    error BatchAlreadyExecuted(bytes32 batchId);
    error NativeTransferFailed(uint256 index);

    // ---------- Events ----------
    event BatchExecuted(
        bytes32 indexed batchId,
        address indexed sender,
        address token,
        uint256 recipientCount,
        uint256 totalAmount,
        uint256 fee
    );
    event PayoutSent(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index);

    /// @notice Pay many recipients in ERC-20 in one tx (requires prior approve of sum).
    function batchPayToken(
        bytes32 batchId,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external;

    /// @notice Pay many recipients in native ETH; msg.value must equal sum + fee.
    function batchPayNative(
        bytes32 batchId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable;

    // ---------- Views ----------
    function MAX_RECIPIENTS() external view returns (uint256);
    function feeBps() external view returns (uint16);
    function isExecuted(bytes32 batchId) external view returns (bool);
    function quoteTotal(uint256[] calldata amounts)
        external
        view
        returns (uint256 sum, uint256 fee);
}
```

**Payroll chunking.** The backend splits CSVs larger than `MAX_RECIPIENTS` (suggested 200, tune with gas benchmarks on testnet) into sequential batches, each with its own deterministic `batchId = keccak256(payrollId, chunkIndex)`.

### 2.6 Contract Security Checklist

- Independent audit plus a public bug bounty before holding meaningful TVL.
- Fuzz and invariant tests: `sum(fees) + sum(net) == sum(gross)`, no stuck funds, no double-claim per interval.
- Admin keys sit behind a Safe multisig and a timelock. The operator key holds only the `OPERATOR` role and rotates regularly.
- Emergency `pause()` exists on every contract, but pausing must never block users from refunding or withdrawing their own escrow.

---

## Section 3: Database Schema (`schema.prisma`)

**Modeling notes**

- On-chain amounts are stored as `Decimal(78,0)` in token base units. A `BigInt` overflows above roughly 9.2 ETH at 18 decimals.
- Money-bearing rows carry `txHash`, `logIndex`, and `blockNumber`, with uniqueness constraints for idempotent verification.
- API keys and webhook secrets are stored only as hashes or encrypted values (see Section 5).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Supabase/Neon pooled vs direct
}

// ---------- Enums ----------
enum Environment { LIVE TEST }
enum InvoiceStatus { DRAFT UNPAID PAID IN_ESCROW DISPUTED REFUNDED EXPIRED CANCELLED }
enum SubscriptionStatus { TRIALING ACTIVE PAUSED PAST_DUE CANCELLED }
enum ChargeStatus { PENDING SUCCEEDED FAILED }
enum WebhookStatus { PENDING DELIVERED FAILED DEAD }
enum PayoutStatus { DRAFT SUBMITTED CONFIRMED FAILED }

// ---------- Merchant ----------
model Merchant {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  walletAddress String   // payout wallet, lowercase 0x
  feeBpsOverride Int?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  apiKeys          ApiKey[]
  webhookEndpoints WebhookEndpoint[]
  invoices         Invoice[]
  plans            Plan[]
  subscriptions    Subscription[]
  payrollBatches   PayrollBatch[]
  webhookLogs      WebhookLog[]

  @@index([walletAddress])
}

model ApiKey {
  id          String      @id @default(cuid())
  merchantId  String
  merchant    Merchant    @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  environment Environment
  label       String?
  publicKey   String      @unique // pk_live_xxx (not secret)
  secretHash  String      @unique // SHA-256 of sk_live_xxx
  secretLast4 String      // display only
  scopes      String[]
  lastUsedAt  DateTime?
  revokedAt   DateTime?
  createdAt   DateTime    @default(now())

  @@index([merchantId])
}

model WebhookEndpoint {
  id              String   @id @default(cuid())
  merchantId      String
  merchant        Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  url             String
  secretEncrypted String   // AES-256-GCM encrypted whsec_xxx
  events          String[] // e.g. payment.succeeded, subscription.charged
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  logs WebhookLog[]

  @@index([merchantId])
}

// ---------- Customer ----------
model Customer {
  id            String   @id @default(cuid())
  walletAddress String   @unique // lowercase 0x
  email         String?
  createdAt     DateTime @default(now())

  subscriptions Subscription[]
  invoices      Invoice[]
  payments      Payment[]
}

// ---------- Invoice / Checkout ----------
model Invoice {
  id            String        @id @default(cuid()) // public: /pay/[id]
  merchantId    String
  merchant      Merchant      @relation(fields: [merchantId], references: [id])
  customerId    String?
  customer      Customer?     @relation(fields: [customerId], references: [id])
  orderId       String        @unique // bytes32 hex used on-chain
  externalRef   String?       // merchant's own order id
  description   String?
  tokenAddress  String        // 0x000..0 = native
  tokenSymbol   String
  tokenDecimals Int
  amount        Decimal       @db.Decimal(78, 0)
  status        InvoiceStatus @default(UNPAID)
  escrowEnabled Boolean       @default(false)
  escrowId      Decimal?      @db.Decimal(78, 0)
  milestones    Json?         // [{title, amount, releaseDeadline}]
  metadata      Json?         // dynamic merchant key/value data
  successUrl    String?
  cancelUrl     String?
  expiresAt     DateTime?
  paidAt        DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  payments Payment[]

  @@index([merchantId, status])
  @@index([expiresAt])
}

model Payment {
  id          String   @id @default(cuid())
  invoiceId   String?
  invoice     Invoice? @relation(fields: [invoiceId], references: [id])
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  txHash      String
  logIndex    Int
  blockNumber BigInt
  payer       String
  gross       Decimal  @db.Decimal(78, 0)
  fee         Decimal  @db.Decimal(78, 0)
  net         Decimal  @db.Decimal(78, 0)
  confirmedAt DateTime @default(now())

  @@unique([txHash, logIndex]) // idempotent verification
  @@index([invoiceId])
}

// ---------- Subscriptions ----------
model Plan {
  id            String   @id @default(cuid())
  merchantId    String
  merchant      Merchant @relation(fields: [merchantId], references: [id])
  onchainPlanId Decimal  @db.Decimal(78, 0)
  name          String
  tokenAddress  String
  amount        Decimal  @db.Decimal(78, 0)
  intervalSecs  Int
  trialSecs     Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  subscriptions Subscription[]

  @@unique([merchantId, onchainPlanId])
}

model Subscription {
  id             String             @id @default(cuid())
  merchantId     String
  merchant       Merchant           @relation(fields: [merchantId], references: [id])
  planId         String
  plan           Plan               @relation(fields: [planId], references: [id])
  customerId     String
  customer       Customer           @relation(fields: [customerId], references: [id])
  onchainSubId   Decimal            @unique @db.Decimal(78, 0)
  status         SubscriptionStatus @default(ACTIVE)
  nextChargeAt   DateTime
  chargesMade    Int                @default(0)
  maxCharges     Int                @default(0)
  failedAttempts Int                @default(0)
  lifetimeCap    Decimal?           @db.Decimal(78, 0)
  totalCharged   Decimal            @default(0) @db.Decimal(78, 0)
  allowanceOk    Boolean            @default(true) // last known allowance >= amount
  lockedUntil    DateTime?          // cron lease to prevent double-processing
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  charges SubscriptionCharge[]

  @@index([status, nextChargeAt]) // hot path for the cron query
  @@index([merchantId])
}

model SubscriptionCharge {
  id             String       @id @default(cuid())
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  status         ChargeStatus
  amount         Decimal      @db.Decimal(78, 0)
  txHash         String?
  failureReason  String?
  attemptedAt    DateTime     @default(now())

  @@index([subscriptionId])
}

// ---------- Payroll ----------
model PayrollBatch {
  id           String       @id @default(cuid())
  merchantId   String
  merchant     Merchant     @relation(fields: [merchantId], references: [id])
  label        String?
  tokenAddress String
  totalAmount  Decimal      @db.Decimal(78, 0)
  status       PayoutStatus @default(DRAFT)
  createdAt    DateTime     @default(now())

  items PayrollItem[]

  @@index([merchantId])
}

model PayrollItem {
  id         String       @id @default(cuid())
  batchId    String
  batch      PayrollBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  chunkIndex Int          @default(0)
  recipient  String
  amount     Decimal      @db.Decimal(78, 0)
  memo       String?
  txHash     String?
  status     PayoutStatus @default(DRAFT)

  @@index([batchId, chunkIndex])
}

// ---------- Webhooks ----------
model WebhookLog {
  id           String          @id @default(cuid())
  merchantId   String
  merchant     Merchant        @relation(fields: [merchantId], references: [id])
  endpointId   String
  endpoint     WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  eventId      String          @unique // evt_xxx, stable across retries
  eventType    String          // payment.succeeded, subscription.charged ...
  payload      Json
  status       WebhookStatus   @default(PENDING)
  statusCode   Int?
  responseBody String?         // truncated to 2KB
  retryCount   Int             @default(0)
  nextRetryAt  DateTime?
  createdAt    DateTime        @default(now())
  deliveredAt  DateTime?

  @@index([status, nextRetryAt])
  @@index([merchantId, createdAt])
}
```

---

## Section 4: Next.js API & Cron Route Handler Specs

**Conventions for all `/api/v1/*` routes**

- Auth: `Authorization: Bearer sk_live_...` (server-to-server). Browser-safe calls use the `pk_` key plus a short-lived session token.
- Request bodies are validated with `zod`. Errors use one shape: `{ error: { code, message } }`.
- Rate limiting is per API key (for example Upstash). Idempotency uses an optional `Idempotency-Key` header.
- Runtime: `export const runtime = 'nodejs'` (needed for `node:crypto`), and `export const dynamic = 'force-dynamic'`.

### 4.1 `POST /api/v1/checkout/verify`

Verifies a payment by transaction hash and fires merchant webhooks.

|  |  |
| --- | --- |
| Auth | `pk_` key with a checkout session token, or `sk_` key |
| Body | `{ invoiceId: string, txHash: 0x... }` |
| 200 | `{ status: 'PAID' \| 'PENDING', invoiceId, txHash }` |
| 4xx | `INVALID_TX`, `AMOUNT_MISMATCH`, `WRONG_MERCHANT`, `ALREADY_PROCESSED` (returned as success, since the call is idempotent), `NOT_FOUND` |

**Verification steps**

1. Load the invoice and confirm it is `UNPAID` and not expired.
2. `getTransactionReceipt`; require `status === 'success'` and the required confirmations.
3. Filter logs by the router address, then `decodeEventLog` for `PaymentProcessed`.
4. Compare `orderId`, `merchant`, `token`, and `gross` with the invoice. Never trust amounts sent by the client.
5. In one Prisma transaction: insert `Payment` (unique on `txHash, logIndex`), update the invoice to `PAID`, and insert a `WebhookLog` outbox row.
6. Dispatch the webhook after commit (or leave it to the retry cron if the dispatch fails).

```ts
// app/api/v1/checkout/verify/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { decodeEventLog, isHex, type Hex } from 'viem';
import { prisma } from '@/lib/db';
import { publicClient } from '@/lib/chain/client';
import { paymentRouterAbi } from '@/lib/chain/abis';
import { authenticate } from '@/lib/auth/api-keys';
import { enqueueAndDispatch } from '@/lib/webhooks/dispatch';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  invoiceId: z.string().min(1),
  txHash: z.string().refine((v): v is Hex => isHex(v) && v.length === 66),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const auth = await authenticate(req); // validates pk_/sk_ key, returns merchantId
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { invoiceId, txHash } = parsed.data;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.merchantId !== auth.merchantId) return fail('NOT_FOUND', 'Invoice not found', 404);
  if (invoice.status === 'PAID') return NextResponse.json({ status: 'PAID', invoiceId, txHash }); // idempotent
  if (invoice.status !== 'UNPAID') return fail('INVALID_STATE', 'Invoice is ' + invoice.status, 409);
  if (invoice.expiresAt && invoice.expiresAt < new Date()) return fail('EXPIRED', 'Invoice expired', 410);

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    return NextResponse.json({ status: 'PENDING', invoiceId, txHash }, { status: 202 });
  }
  if (receipt.status !== 'success') return fail('INVALID_TX', 'Transaction reverted');

  const head = await publicClient.getBlockNumber();
  if (head - receipt.blockNumber < BigInt(env.REQUIRED_CONFIRMATIONS)) {
    return NextResponse.json({ status: 'PENDING', invoiceId, txHash }, { status: 202 });
  }

  // Find the PaymentProcessed log emitted by OUR router for THIS order
  let match: { logIndex: number; args: any } | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== env.PAYMENT_ROUTER_ADDRESS.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: paymentRouterAbi, data: log.data, topics: log.topics });
      if (ev.eventName === 'PaymentProcessed' && (ev.args as any).orderId === invoice.orderId) {
        match = { logIndex: log.logIndex, args: ev.args };
        break;
      }
    } catch { /* not our event */ }
  }
  if (!match) return fail('INVALID_TX', 'No matching PaymentProcessed event');

  const { merchant, token, gross, fee, net, payer } = match.args;
  const merchantWallet = (await prisma.merchant.findUniqueOrThrow({ where: { id: invoice.merchantId } })).walletAddress;
  if (merchant.toLowerCase() !== merchantWallet.toLowerCase()) return fail('WRONG_MERCHANT', 'Merchant mismatch');
  if (token.toLowerCase() !== invoice.tokenAddress.toLowerCase()) return fail('INVALID_TX', 'Token mismatch');
  if (gross < BigInt(invoice.amount.toFixed(0))) return fail('AMOUNT_MISMATCH', 'Underpaid');

  const event = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { walletAddress: payer.toLowerCase() },
      create: { walletAddress: payer.toLowerCase() },
      update: {},
    });
    await tx.payment.create({
      data: {
        invoiceId: invoice.id, customerId: customer.id, txHash, logIndex: match!.logIndex,
        blockNumber: receipt.blockNumber, payer: payer.toLowerCase(),
        gross: gross.toString(), fee: fee.toString(), net: net.toString(),
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date(), customerId: customer.id },
    });
    return { type: 'payment.succeeded', merchantId: invoice.merchantId, data: { invoiceId: invoice.id, orderId: invoice.orderId, externalRef: invoice.externalRef, txHash, amount: gross.toString(), token, payer } };
  });

  // Fire-and-forget; failures are retried by /api/cron/retry-webhooks
  void enqueueAndDispatch(event);

  return NextResponse.json({ status: 'PAID', invoiceId, txHash });
}
```

### 4.2 `GET /api/cron/process-subscriptions`

Triggered by Vercel Cron. It selects due subscriptions, leases them to prevent double-processing, simulates each claim, and submits `claimBatch` with the operator key.

**`vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/process-subscriptions", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/retry-webhooks", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/reconcile-chain", "schedule": "0 * * * *" }
  ]
}
```

**Security and correctness**

- Vercel sends `Authorization: Bearer $CRON_SECRET`; reject anything else with a constant-time compare.
- `OPERATOR_PRIVATE_KEY` lives only in server env (a KMS or HSM-backed signer is better for production), is funded with minimal gas, and holds only the on-chain `OPERATOR` role.
- Lease rows with `lockedUntil` so overlapping runs never double-charge. The contract's `NotDue` check is the final backstop.
- Cap batch size (for example 50) and set `maxDuration` so a run fits the function time limit.
- Do not rely on cron punctuality. Missed runs self-heal because the next run picks up all rows with `nextChargeAt <= now()`.

```ts
// app/api/cron/process-subscriptions/route.ts
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { publicClient, operatorWallet } from '@/lib/chain/client';
import { subscriptionVaultAbi } from '@/lib/chain/abis';
import { enqueueAndDispatch } from '@/lib/webhooks/dispatch';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH = 50;

function authorized(req: Request) {
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from('Bearer ' + env.CRON_SECRET);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });

  const now = new Date();
  const lease = new Date(now.getTime() + 5 * 60_000);

  // 1) Lease a batch atomically (SKIP LOCKED avoids contention between runs)
  const due = await prisma.$queryRaw<{ id: string; onchainSubId: string }[]>`
    UPDATE "Subscription" SET "lockedUntil" = ${lease}
    WHERE id IN (
      SELECT id FROM "Subscription"
      WHERE status IN ('ACTIVE','TRIALING','PAST_DUE')
        AND "nextChargeAt" <= ${now}
        AND ("lockedUntil" IS NULL OR "lockedUntil" < ${now})
      ORDER BY "nextChargeAt" ASC
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "onchainSubId"::text AS "onchainSubId"`;
  if (due.length === 0) return NextResponse.json({ processed: 0 });

  const subIds = due.map((d) => BigInt(d.onchainSubId));

  try {
    // 2) Simulate first: catches reverts and estimates gas without spending it
    const { request, result } = await publicClient.simulateContract({
      address: env.SUBSCRIPTION_VAULT_ADDRESS as `0x${string}`,
      abi: subscriptionVaultAbi,
      functionName: 'claimBatch',
      args: [subIds],
      account: operatorWallet.account,
    });

    // 3) Submit and wait
    const hash = await operatorWallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 4) Persist results per subscription
    for (let i = 0; i < due.length; i++) {
      const ok = result[i];
      const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: due[i].id }, include: { plan: true } });
      if (ok) {
        const next = new Date(sub.nextChargeAt.getTime() + sub.plan.intervalSecs * 1000);
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: { nextChargeAt: next, chargesMade: { increment: 1 }, failedAttempts: 0, status: 'ACTIVE', lockedUntil: null },
          }),
          prisma.subscriptionCharge.create({ data: { subscriptionId: sub.id, status: 'SUCCEEDED', amount: sub.plan.amount, txHash: hash } }),
        ]);
        void enqueueAndDispatch({ type: 'subscription.charged', merchantId: sub.merchantId, data: { subscriptionId: sub.id, txHash: hash } });
      } else {
        const attempts = sub.failedAttempts + 1;
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: {
              failedAttempts: attempts,
              status: attempts >= 3 ? 'PAST_DUE' : sub.status,
              nextChargeAt: new Date(Date.now() + 24 * 3600_000), // retry tomorrow
              lockedUntil: null,
            },
          }),
          prisma.subscriptionCharge.create({ data: { subscriptionId: sub.id, status: 'FAILED', amount: sub.plan.amount, failureReason: 'allowance_or_balance' } }),
        ]);
        void enqueueAndDispatch({ type: 'subscription.payment_failed', merchantId: sub.merchantId, data: { subscriptionId: sub.id, attempts } });
      }
    }
    return NextResponse.json({ processed: due.length, txHash: hash });
  } catch (err) {
    // Release leases so the next run can retry
    await prisma.subscription.updateMany({ where: { id: { in: due.map((d) => d.id) } }, data: { lockedUntil: null } });
    console.error('process-subscriptions failed', err);
    return NextResponse.json({ error: 'batch_failed' }, { status: 500 });
  }
}
```

### 4.3 `POST /api/v1/invoices/create`

Creates an invoice and returns a hosted payment link (`/pay/[invoiceId]`).

|  |  |
| --- | --- |
| Auth | `sk_live_` / `sk_test_` |
| Body | `{ amount: '49.00', token: 'USDC', description?, externalRef?, escrow?: { enabled, milestones[] }, metadata?, expiresInMinutes?, successUrl?, cancelUrl? }` |
| 201 | `{ id, url, orderId, status: 'UNPAID', expiresAt }` |

**Rules:** amounts are parsed with `parseUnits(amount, decimals)` using the token's registry decimals. Milestones must sum to the total. `orderId = keccak256(merchantId + invoiceId)` makes it unique and not guessable.

```ts
// app/api/v1/invoices/create/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { keccak256, toHex, parseUnits } from 'viem';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth/api-keys';
import { TOKENS } from '@/lib/chain/tokens';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  token: z.enum(['USDC', 'ETH']),
  description: z.string().max(280).optional(),
  externalRef: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  expiresInMinutes: z.number().int().min(5).max(60 * 24 * 30).default(60 * 24),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  escrow: z.object({
    enabled: z.boolean(),
    milestones: z.array(z.object({ title: z.string(), amount: z.string(), releaseInDays: z.number().int().min(1) })).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  const auth = await authenticate(req, { requireSecret: true });
  if (!auth) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message } }, { status: 400 });
  const b = parsed.data;

  const token = TOKENS[b.token];
  const amount = parseUnits(b.amount, token.decimals);

  if (b.escrow?.enabled) {
    const sum = (b.escrow.milestones ?? []).reduce((a, m) => a + parseUnits(m.amount, token.decimals), 0n);
    if (sum !== amount) return NextResponse.json({ error: { code: 'MILESTONE_SUM', message: 'Milestones must equal total' } }, { status: 400 });
  }

  const id = createId();
  const orderId = keccak256(toHex(auth.merchantId + ':' + id));
  const expiresAt = new Date(Date.now() + b.expiresInMinutes * 60_000);

  const invoice = await prisma.invoice.create({
    data: {
      id, orderId, merchantId: auth.merchantId,
      description: b.description, externalRef: b.externalRef,
      tokenAddress: token.address, tokenSymbol: b.token, tokenDecimals: token.decimals,
      amount: amount.toString(), escrowEnabled: !!b.escrow?.enabled,
      milestones: b.escrow?.milestones ?? undefined,
      metadata: b.metadata, successUrl: b.successUrl, cancelUrl: b.cancelUrl,
      status: 'UNPAID', expiresAt,
    },
  });

  return NextResponse.json(
    { id: invoice.id, url: env.APP_URL + '/pay/' + invoice.id, orderId, status: invoice.status, expiresAt },
    { status: 201 },
  );
}
```

**Supporting endpoints (summary)**

| Route | Purpose |
| --- | --- |
| `GET /api/v1/invoices/[id]/receipt` | Streams a PDF receipt (for example `@react-pdf/renderer`), only for `PAID` invoices |
| `POST /api/v1/payroll/batches` | Parses CSV (`papaparse`), validates addresses with `isAddress`, rejects duplicates and zero amounts, chunks by `MAX_RECIPIENTS`, and returns calldata for the wallet to sign |
| `GET /api/cron/retry-webhooks` | Redelivers `PENDING`/`FAILED` rows whose `nextRetryAt <= now()` |
| `GET /api/cron/reconcile-chain` | Re-scans recent blocks for router events missed by the verify flow, so no payment is ever lost if a customer closes the tab |

---

## Section 5: Webhook & Security Architecture

### 5.1 API Key Lifecycle (`pk_live_...` / `sk_live_...`)

| Key | Purpose | Storage | Exposure |
| --- | --- | --- | --- |
| `pk_live_...` | Identifies the merchant in browser SDKs, can only create checkout sessions and verify its own sessions, and is origin-restricted | Plain text (it is not a secret) | Public |
| `sk_live_...` | Full server-side access (create invoices, read payments, manage webhooks) | **SHA-256 hash only**, plus last 4 characters for display | Shown **once** at creation |

**Why SHA-256 and not bcrypt:** secret keys are 256-bit random values, so there is nothing to brute-force. A fast hash keeps per-request auth cheap, and a database leak does not reveal usable keys.

**Lifecycle**

1. **Create:** generate with `crypto.randomBytes(32)`, prefix by type and environment, hash, store, and return the plaintext once.
2. **Validate:** parse the prefix to determine type and environment, hash the presented secret, and look it up by the unique `secretHash` index. Reject revoked keys, and update `lastUsedAt` asynchronously.
3. **Rotate:** create a new key, let the merchant migrate, then revoke the old one (`revokedAt`). Support a short overlap window.
4. **Environment isolation:** `test` keys only touch testnet chain config and `Environment.TEST` rows, so they can never move mainnet funds.

```ts
// lib/auth/api-keys.ts
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

type Env = 'live' | 'test';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createApiKeyPair(merchantId: string, env: Env, label?: string) {
  const publicKey = 'pk_' + env + '_' + randomBytes(16).toString('base64url');
  const secret = 'sk_' + env + '_' + randomBytes(32).toString('base64url');

  await prisma.apiKey.create({
    data: {
      merchantId,
      environment: env === 'live' ? 'LIVE' : 'TEST',
      label,
      publicKey,
      secretHash: sha256(secret),
      secretLast4: secret.slice(-4),
      scopes: ['invoices:write', 'payments:read', 'webhooks:write'],
    },
  });

  // Return the plaintext secret ONCE; it cannot be recovered later.
  return { publicKey, secret };
}

export async function authenticate(req: Request, opts: { requireSecret?: boolean } = {}) {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const isSecret = token.startsWith('sk_');
  if (opts.requireSecret && !isSecret) return null;

  const key = await prisma.apiKey.findFirst({
    where: isSecret ? { secretHash: sha256(token) } : { publicKey: token },
    select: { id: true, merchantId: true, environment: true, revokedAt: true, scopes: true },
  });
  if (!key || key.revokedAt) return null;

  void prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { merchantId: key.merchantId, environment: key.environment, scopes: key.scopes, isSecret };
}
```

### 5.2 Webhook Signing (HMAC SHA-256)

Each endpoint has its own signing secret (`whsec_...`), stored AES-256-GCM encrypted because the server must be able to read it to sign. Each delivery carries:

```
RobinPay-Signature: t=1760000000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
RobinPay-Event-Id: evt_2f8a...
Content-Type: application/json
```

- `t` is the Unix timestamp at signing time, which defeats replay attacks.
- `v1 = hex( HMAC_SHA256( secret, t + '.' + rawBody ) )`. The `v1` label allows a future algorithm upgrade.
- `RobinPay-Event-Id` is stable across retries, so merchants can deduplicate.

**Sender side (RobinPay)**

```ts
// lib/webhooks/sign.ts
import { createHmac } from 'node:crypto';

export function signWebhook(secret: string, rawBody: string, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
  return { header: 't=' + timestamp + ',v1=' + v1, timestamp };
}
```

**Receiver side (merchant backend, Express example)**

The signature is computed over the **raw bytes**. Parsing JSON first and re-serializing breaks verification.

```ts
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

const app = express();
const TOLERANCE_SECS = 300; // reject deliveries older than 5 minutes

function verify(rawBody: Buffer, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECS) return false;

  const expected = createHmac('sha256', secret).update(t + '.' + rawBody.toString('utf8')).digest();
  const given = Buffer.from(parts.v1 ?? '', 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

app.post('/webhooks/robinpay', express.raw({ type: 'application/json' }), (req, res) => {
  const ok = verify(req.body, req.header('RobinPay-Signature') ?? '', process.env.ROBINPAY_WHSEC!);
  if (!ok) return res.status(400).send('invalid signature');

  const event = JSON.parse(req.body.toString('utf8'));
  // 1) dedupe on event.id  2) enqueue work  3) respond fast
  res.status(200).send('ok');
});
```

### 5.3 Delivery, Retries & Event Catalog

| Attempt | Delay after previous failure |
| --- | --- |
| 1 | immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 12 hours, then marked `DEAD` (retryable manually from the dashboard) |

Success means any `2xx` within a 10-second timeout. Log status code, truncated response body, and retry count in `WebhookLog`.

**Core events:** `payment.succeeded`, `payment.failed`, `invoice.expired`, `escrow.funded`, `escrow.milestone_released`, `escrow.disputed`, `subscription.created`, `subscription.charged`, `subscription.payment_failed`, `subscription.cancelled`, `payroll.batch_confirmed`.

### 5.4 Security Hardening Checklist

- **Webhook SSRF protection:** require HTTPS, resolve DNS and block private, loopback, and link-local ranges, disable redirects, and enforce a response size cap.
- **Trust the chain, not the client:** the verify route re-derives everything from the receipt and ignores client-reported amounts.
- **Operator key:** minimal role, minimal gas balance, KMS-backed signing in production, alerting on unusual claim volume, and a documented rotation runbook.
- **Origin restrictions** on `pk_` keys, strict CORS, CSP headers on `/pay/*`, and `frame-ancestors` limited to approved merchant origins for the embed.
- **Rate limits** per key and per IP, plus request body size limits.
- **Secrets hygiene:** zod-validated `env.ts`, no secrets in client bundles (only `NEXT_PUBLIC_*` is exposed), and log redaction for `Authorization` headers.
- **Database:** row-level security if using Supabase directly, least-privilege DB role for the app, and encrypted backups.
- **Dependency and supply chain:** lockfile, Dependabot, and `npm audit` in CI.
- **Operations:** admin actions behind multisig, on-chain monitoring (Tenderly or OpenZeppelin Defender style alerts) for pauses, role changes, and large transfers.

---

## Section 6: 1-Week Launch & Marketing Execution Plan

**Goal:** turn a developer audience into integrators by launch day, with proof (working demos, docs, and code) at every step.

> **Compliance note:** if a token launches alongside mainnet, keep payment-gateway messaging separate from any token messaging, avoid promises of price or returns, and get legal review of token-related posts in your target jurisdictions. Treat the token as a secondary announcement, not the headline.

**Pre-launch checklist (before Day 1):** testnet deployed and verified on the explorer, docs site live, SDK published to npm (`@robinpay/checkout`), a public demo store, a short waitlist page, branded X/GitHub/Discord handles, and 3 to 5 friendly merchants lined up for launch-day quotes.

### Day 1 — Tease & Problem Framing

- **X post:** a pain-point hook such as: *Accepting crypto payments still means wallet popups, manual confirmations, and zero recurring billing. We're fixing that on Robinhood Chain. Shipping in 7 days.*
- **Asset:** a 15-second teaser clip (dark UI, a checkout going from click to Paid in about 2 seconds).
- **Dev content:** pin the GitHub org and open the waitlist.
- **Community:** announce the build-in-public thread and the Discord.

### Day 2 — Module 1: Checkout in 5 Lines

- **Screen recording (45s):** install the SDK, drop in the button, pay on testnet, and watch the webhook land.
- **Code snippet image:**

```tsx
import { RobinPayButton } from '@robinpay/checkout';

<RobinPayButton
  publicKey={process.env.NEXT_PUBLIC_RP_PK}
  amount='49.00'
  token='USDC'
  onSuccess={(p) => console.log('paid', p.txHash)}
/>
```

- **X thread (5 posts):** the problem, the 5-line integration, instant settlement, webhook signing, and a link to docs.
- **Dev announcement:** publish the quickstart doc and an example repo.

### Day 3 — Module 2: Subscriptions on Autopilot

- **Screen recording:** subscribe once, show the plan and allowance cap, then fast-forward a cron cycle to a charge and its webhook.
- **Explainer graphic:** a diagram of the pull-payment model, emphasizing that the customer's allowance and the plan limits are enforced on-chain, so the operator cannot overcharge.
- **X thread:** how recurring billing works without custody, why it is safer than raw approvals, and a testnet link to try it.
- **Dev post:** a short blog post, Building SaaS billing on-chain.

### Day 4 — Module 3: Invoices, Payment Links & Escrow

- **Screen recording:** create an invoice via the API, open `/pay/[id]`, pay, and download the PDF receipt. Then show an escrow invoice with a milestone release.
- **Code snippet:** the `curl` call to `POST /api/v1/invoices/create`.
- **X post:** freelancer and agency angle, for example: *Send a link, get paid in USDC, funds held in escrow until the milestone is approved.*
- **Community:** invite freelancers and DAOs to a testnet bounty (small rewards for bug reports).

### Day 5 — Module 4: Payroll in One Transaction

- **Screen recording:** upload a CSV of 150 wallets, preview validation, sign once, and show all recipients paid in one block with gas cost on screen.
- **Graphic:** a cost comparison of 150 separate transfers versus one batch.
- **X thread:** DAO contributor payouts, vendor payments, and airdrop-style distributions.
- **Outreach:** DM 10 DAOs and contributor-heavy teams with a personal walkthrough offer.

### Day 6 — Trust Day: Security, Docs & Proof

- **Post:** security architecture summary (hashed keys, HMAC webhooks, bounded operator role, audit status, and bug bounty).
- **Asset:** a 60-second webhook verification tutorial video with the verifier code from Section 5.
- **Dev announcement:** open the docs, API reference, and the status page. Share the contract addresses and verification links.
- **Community:** an AMA or Spaces session with a live integration demo, and testimonials from early merchants.

### Day 7 — Launch Day

- **Morning:** mainnet contracts live, verified, and announced with explorer links. Post the full demo video (90s) and pin it.
- **Product Hunt / Hacker News / dev communities:** a Show HN-style post focused on the technical build, with docs, SDK, and open-source examples.
- **X launch thread (8 to 10 posts):** what shipped across the four modules, the 5-line integration, pricing (protocol fee in bps), links, and a call to action to get an API key.
- **Merchant spotlights:** reshare early adopters' quotes and first live transactions.
- **Evening:** a live recap, a metrics post (integrations, volume, transactions), and an invitation to the next hackathon or grant round.
- **Optional token announcement:** a separate post following the compliance note above.

### Daily Operating Rhythm & Metrics

| Time | Activity |
| --- | --- |
| Morning | Publish the day's primary asset and thread |
| Midday | Engage replies and quote-posts, and answer dev questions fast |
| Afternoon | Cross-post to Discord, dev forums, and Reddit communities where allowed |
| Evening | Collect feedback, fix top issues, and queue tomorrow's assets |

**Track:** waitlist signups, docs visits, npm installs, API keys created, testnet transactions, first live merchant, webhook delivery success rate, and median verify latency.
