// =============================================================================
// lib/env.ts — Zod-validated environment (database-free)
// =============================================================================
// Only NEXT_PUBLIC_* variables are exposed to the browser. All other variables
// are server-only. Read once at module load; throw on missing/invalid values so
// misconfiguration fails fast instead of silently leaking funds.
// The blockchain is the only source of truth; nothing is persisted server-side.
import { z } from 'zod';

const envSchema = z.object({
  // App
  APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Robinhood Chain (Chain ID 4663)
  NEXT_PUBLIC_ROBINHOOD_CHAIN_ID: z.string().transform((val) => Number(val)),
  ROBINHOOD_CHAIN_ID: z.string().transform((val) => Number(val)),
  ROBINHOOD_RPC_URL: z.string().url(),
  NEXT_PUBLIC_ROBINHOOD_RPC_URL: z.string().url(),
  NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL: z.string().url().optional(),
  NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS: z.string().optional(),

  // Contracts
  PAYMENT_ROUTER_ADDRESS: z.string(),
  SUBSCRIPTION_VAULT_ADDRESS: z.string(),
  ESCROW_INVOICE_ADDRESS: z.string(),
  BATCH_PAYOUT_ADDRESS: z.string(),

  // Stablecoin registry
  NEXT_PUBLIC_USDC_ADDRESS: z.string(),
  USDC_ADDRESS: z.string(),
  USDC_DECIMALS: z.string().transform((val) => Number(val)),

  // Operator (cron signer)
  OPERATOR_PRIVATE_KEY: z.string().min(1),

  // Signing secrets (no database; all state lives on-chain or in signed tokens)
  INVOICE_SIGNING_SECRET: z.string().min(1),
  API_KEY_SIGNING_SECRET: z.string().min(1),
  MASTER_WEBHOOK_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),

  // Security
  MIN_KEY_VERSION: z.string().transform((val) => Number(val)).default('1'),
  REQUIRED_CONFIRMATIONS: z.string().transform((val) => Number(val)).default('1'),
  WEBHOOK_TIMEOUT_MS: z.string().transform((val) => Number(val)).default('10000'),
  CRON_SECRET: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;

let _env: Env;

export function env(): Env {
  if (_env) return _env;
  // Next.js exposes NEXT_PUBLIC_* on process.env at build time; validate the
  // union of server + client variables.
  _env = envSchema.parse({
    ...process.env,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL,
    NEXT_PUBLIC_ROBINHOOD_CHAIN_ID: process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID ?? process.env.ROBINHOOD_CHAIN_ID,
    NEXT_PUBLIC_ROBINHOOD_RPC_URL: process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? process.env.ROBINHOOD_RPC_URL,
    NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS ?? process.env.USDC_ADDRESS,
  });
  return _env;
}

export const isTestnet = (): boolean => {
  return env().ROBINHOOD_CHAIN_ID === 4663;
};

export const getContractAddress = (
  name: 'paymentRouter' | 'subscriptionVault' | 'escrowInvoice' | 'batchPayout',
): string => {
  const map: Record<string, string> = {
    paymentRouter: env().PAYMENT_ROUTER_ADDRESS,
    subscriptionVault: env().SUBSCRIPTION_VAULT_ADDRESS,
    escrowInvoice: env().ESCROW_INVOICE_ADDRESS,
    batchPayout: env().BATCH_PAYOUT_ADDRESS,
  };
  return map[name];
};

export const getPublicContractAddress = (): string | undefined => {
  return env().NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS;
};
