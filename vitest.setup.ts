// =============================================================================
// vitest.setup.ts — Test environment variables
// =============================================================================
// Set all required env vars before stateless modules call env(). The blockchain
// is the only source of truth in production; here we just satisfy zod validation.
process.env.APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID = '4663';
process.env.ROBINHOOD_CHAIN_ID = '4663';
process.env.ROBINHOOD_RPC_URL = 'http://localhost:8545';
process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL = 'http://localhost:8545';
process.env.PAYMENT_ROUTER_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.SUBSCRIPTION_VAULT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.ESCROW_INVOICE_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.BATCH_PAYOUT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_USDC_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.USDC_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.USDC_DECIMALS = '6';
process.env.OPERATOR_PRIVATE_KEY = '0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
process.env.INVOICE_SIGNING_SECRET = 'test-invoice-secret';
process.env.API_KEY_SIGNING_SECRET = 'test-api-key-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.MASTER_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.WEBHOOK_CONFIG_SECRET = 'test-webhook-config-secret';
process.env.CRON_SECRET = 'test-cron-secret';
