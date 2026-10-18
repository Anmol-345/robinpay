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

const targetChainId =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID
    ? parseInt(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID, 10)
    : 46630;

const targetChainIdHex = `0x${targetChainId.toString(16)}`;

const ROBINHOOD_CHAIN_CLIENT_SIDE = defineChain({
  id: targetChainId,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL && !process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL.includes('.example')
          ? process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL
          : 'https://rpc.testnet.chain.robinhood.com',
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL && !process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL.includes('.example')
          ? process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL
          : 'https://rpc.testnet.chain.robinhood.com',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Chain Testnet Explorer',
      url:
        process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL && !process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL.includes('.example')
          ? process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL
          : 'https://explorer.testnet.chain.robinhood.com',
    },
  },
  testnet: true,
});

let _client: WalletClient | null = null;
let _account: `0x${string}` | null = null;

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export async function switchToRobinhoodChain(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('NO_WALLET: No Ethereum wallet detected.');
  }

  const rpcUrl =
    process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL &&
    !process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL.includes('.example')
      ? process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL
      : 'https://rpc.testnet.chain.robinhood.com';

  const explorerUrl =
    process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL &&
    !process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL.includes('.example')
      ? process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL
      : 'https://explorer.testnet.chain.robinhood.com';

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainIdHex }],
    });
  } catch (switchError: any) {
    const isMissingChain =
      switchError?.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.includes('4902') ||
      switchError?.message?.includes('Unrecognized chain');

    if (isMissingChain) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: targetChainIdHex,
            chainName: 'Robinhood Chain Testnet',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [explorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export async function connectWallet(options?: {
  requireChain?: boolean;
}): Promise<{ address: `0x${string}`; chainId: number }> {
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

  // Attempt to switch to Robinhood Chain Testnet if needed, or add it if not present
  try {
    await switchToRobinhoodChain();
  } catch (chainErr) {
    console.warn('Switch/add chain warning:', chainErr);
    if (options?.requireChain) {
      throw new Error(`WRONG_CHAIN: Please switch to Robinhood Chain Testnet (Chain ID ${targetChainId})`);
    }
  }

  return { address: accounts[0], chainId: targetChainId };
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
  data?: Hex;
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

export async function addTestnetTokenToWallet(options?: {
  address?: `0x${string}`;
  symbol?: string;
  decimals?: number;
  image?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('NO_WALLET: No Ethereum wallet detected. Install MetaMask or similar.');
  }

  const tokenAddress =
    options?.address ??
    (process.env.NEXT_PUBLIC_USDC_ADDRESS &&
    process.env.NEXT_PUBLIC_USDC_ADDRESS !== '0x0000000000000000000000000000000000000000'
      ? (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`)
      : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');

  const symbol = options?.symbol ?? 'USDC';
  const decimals = options?.decimals ?? 6;
  const image =
    options?.image ??
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png';

  try {
    const wasAdded = (await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddress,
          symbol,
          decimals,
          image,
        },
      },
    })) as boolean;
    return wasAdded;
  } catch (error) {
    console.error('Error adding token to wallet:', error);
    throw error;
  }
}
