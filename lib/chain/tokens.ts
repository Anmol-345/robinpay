// =============================================================================
// lib/chain/tokens.ts — Stablecoin / token registry
// =============================================================================
// Addresses are loaded from env (never hardcoded) and must be confirmed against
// Robinhood Chain's official docs for testnet vs mainnet.
import { env } from '@/lib/env';

export interface Token {
  symbol: string;
  name: string;
  address: `0x${string}`; // 0x0000...0000 = native ETH
  decimals: number;
  allowlisted: boolean;
}

export const NATIVE_TOKEN: Token = {
  symbol: 'ETH',
  name: 'Ether',
  address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  decimals: 18,
  allowlisted: true,
};

export function USDC(): Token {
  const address = env().USDC_ADDRESS as `0x${string}`;
  return {
    symbol: 'USDC',
    name: 'USD Coin',
    address,
    decimals: env().USDC_DECIMALS,
    allowlisted: true,
  };
}

export const TOKENS_BY_SYMBOL: Record<string, Token> = {
  ETH: NATIVE_TOKEN,
};

export function getToken(symbol: string): Token | undefined {
  if (symbol === 'USDC') return USDC();
  return TOKENS_BY_SYMBOL[symbol];
}

export function isAllowlisted(token: Token): boolean {
  return token.allowlisted;
}

export function isNative(token: Token): boolean {
  return token.address === '0x0000000000000000000000000000000000000000';
}
