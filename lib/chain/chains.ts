// =============================================================================
// lib/chain/chains.ts — Robinhood Chain (Arbitrum Orbit EVM L2, Chain ID 4663)
// =============================================================================
// Chain config is never hardcoded beyond the chain ID; RPC URLs come from env.
// Confirm these values against Robinhood Chain's official docs.
import { defineChain } from 'viem';

export const ROBINHOOD_CHAIN_ID =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID
    ? parseInt(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID, 10)
    : 46630;

export function robinhoodChain(rpcUrl: string) {
  return defineChain({
    id: ROBINHOOD_CHAIN_ID,
    name: 'Robinhood Chain Testnet',
    network: 'robinhood-chain-testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
    blockExplorers: {
      default: {
        name: 'Robinhood Chain Testnet Explorer',
        url: process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL || 'https://explorer.testnet.robinhoodchain.com',
      },
    },
    testnet: true,
  });
}
