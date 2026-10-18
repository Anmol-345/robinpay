// =============================================================================
// lib/chain/wallet.ts — Client-side wallet (viem + window.ethereum)
// =============================================================================
// Connects the customer's wallet (MetaMask, Rainbow, Coinbase Wallet, etc.)
// and signs the payment transaction on Robinhood Chain.
import { createWalletClient, custom, defineChain, type Hex, type WalletClient } from 'viem';

interface EthereumLikeProvider {
  request(...args: unknown[]): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumLikeProvider;
  }
}

const ROBINHOOD_CHAIN_CLIENT_SIDE = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? ''] },
    public: { http: [process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? ''] },
  },
});

let _client: WalletClient | null = null;
let _account: `0x${string}` | null = null;

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export async function connectWallet(): Promise<{ address: `0x${string}`; chainId: number }> {
  if (!isWalletAvailable()) {
    throw new Error('NO_WALLET: No Ethereum wallet detected. Install MetaMask or similar.');
  }
  if (!_client) {
    _client = createWalletClient({
      chain: ROBINHOOD_CHAIN_CLIENT_SIDE,
      transport: custom(window.ethereum!),
    });
  }

  const accounts = await _client.requestAddresses();
  if (accounts.length === 0) throw new Error('NO_ACCOUNTS: No accounts available');
  _account = accounts[0];

  _client = createWalletClient({
    account: _account,
    chain: ROBINHOOD_CHAIN_CLIENT_SIDE,
    transport: custom(window.ethereum!),
  });

  // Switch to Robinhood Chain if needed
  try {
    await _client.switchChain({ id: 4663 });
  } catch {
    throw new Error('WRONG_CHAIN: Please switch to Robinhood Chain (Chain ID 4663)');
  }

  return { address: accounts[0], chainId: 4663 };
}

export function getWalletClient(): WalletClient | null {
  return _client;
}

export async function signAndSendTx({
  to,
  data,
  value,
}: {
  to: `0x${string}`;
  data: Hex;
  value?: bigint;
}): Promise<`0x${string}`> {
  if (!_client || !_account) throw new Error('WALLET_NOT_CONNECTED');
  const hash = await _client.sendTransaction({
    to,
    data,
    value,
    account: _account,
    chain: ROBINHOOD_CHAIN_CLIENT_SIDE,
  });
  return hash;
}
