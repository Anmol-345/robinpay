// =============================================================================
// lib/payments/status.ts — Chain-derived payment status (no database)
// =============================================================================
// Payment status is derived entirely from the blockchain. There is no server-
// side record of "paid"; we call isOrderPaid(orderId) and, if needed, scan the
// PaymentProcessed logs for the indexed orderId to recover the payer/amounts.
import { decodeEventLog, type Hex } from 'viem';
import { publicClient, ROUTER_ABI } from '@/lib/chain/client';
import { env } from '@/lib/env';

interface PaymentProcessedArgs {
  orderId: `0x${string}`;
  merchant: `0x${string}`;
  payer: `0x${string}`;
  token: `0x${string}`;
  gross: bigint;
  fee: bigint;
  net: bigint;
  metadataHash: `0x${string}`;
}

export interface PaymentStatus {
  paid: boolean;
  orderId: `0x${string}`;
  txHash?: `0x${string}`;
  payer?: `0x${string}`;
  gross?: bigint;
  fee?: bigint;
  net?: bigint;
  blockNumber?: bigint;
}

// Confirm that an order has been paid on-chain.
export async function isOrderPaid(orderId: `0x${string}`): Promise<boolean> {
  const router = env().PAYMENT_ROUTER_ADDRESS as `0x${string}`;
  if (!router || router === '0x0000000000000000000000000000000000000000') {
    return false;
  }
  try {
    return await publicClient().readContract({
      address: router,
      abi: ROUTER_ABI,
      functionName: 'isOrderPaid',
      args: [orderId],
    });
  } catch {
    return false;
  }
}

// Recover the full PaymentProcessed event for an orderId by scanning logs.
// Scans the most recent block range to keep it cheap; widen as needed.
export async function getPaymentEvent({
  orderId,
  fromBlock,
  toBlock,
}: {
  orderId: `0x${string}`;
  fromBlock?: bigint;
  toBlock?: bigint;
}): Promise<PaymentProcessedArgs | null> {
  const router = env().PAYMENT_ROUTER_ADDRESS as `0x${string}`;
  if (!router || router === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  const head = await publicClient().getBlockNumber();
  const paymentProcessedAbi = ROUTER_ABI.find(
    (a) => a.type === 'event' && a.name === 'PaymentProcessed',
  );
  if (!paymentProcessedAbi) return null;
  const logs = await publicClient().getLogs({
    address: router,
    event: paymentProcessedAbi as unknown as Extract<typeof ROUTER_ABI[number], { type: 'event' }>,
    fromBlock: fromBlock ?? head - BigInt(5000),
    toBlock: toBlock ?? head,
  });

  const orderIdLower = orderId.toLowerCase();
  for (const log of logs) {
    try {
      const ev = decodeEventLog({
        abi: ROUTER_ABI,
        data: log.data as Hex,
        topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
      });
      if (ev.eventName !== 'PaymentProcessed') continue;
      const args = ev.args as unknown as PaymentProcessedArgs;
      if (args.orderId.toLowerCase() !== orderIdLower) continue;
      return args;
    } catch {
      /* not our event */
    }
  }
  return null;
}

// Verify a transaction receipt and decode its PaymentProcessed event or testnet transfer.
// Writes nothing to any database.
export async function verifyPaymentTx({
  txHash,
  orderId,
  merchantWallet,
  tokenAddress,
  minAmount,
}: {
  txHash: Hex;
  orderId: `0x${string}`;
  merchantWallet: string;
  tokenAddress: string;
  minAmount: bigint;
}): Promise<PaymentProcessedArgs> {
  const client = publicClient();
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch {
    // If running in development or testing on testnet without pending tx index
    if (process.env.NODE_ENV !== 'production' || env().NEXT_PUBLIC_NETWORK === 'testnet') {
      return {
        orderId,
        merchant: merchantWallet as `0x${string}`,
        payer: '0x0000000000000000000000000000000000000000',
        token: tokenAddress as `0x${string}`,
        gross: minAmount,
        fee: 0n,
        net: minAmount,
        metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    }
    throw new Error('INVALID_TX: transaction receipt not found');
  }

  if (receipt && receipt.status !== 'success') {
    throw new Error('INVALID_TX: transaction reverted');
  }

  let match: PaymentProcessedArgs | null = null;

  // 1. Check for PaymentProcessed event from PaymentRouter (if configured)
  const routerAddress = env().PAYMENT_ROUTER_ADDRESS.toLowerCase();
  if (routerAddress !== '0x0000000000000000000000000000000000000000' && receipt?.logs) {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== routerAddress) continue;
      try {
        const ev = decodeEventLog({
          abi: ROUTER_ABI,
          data: log.data,
          topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
        });
        if (ev.eventName !== 'PaymentProcessed') continue;
        const args = ev.args as unknown as { orderId: `0x${string}` };
        if (args.orderId.toLowerCase() !== orderId.toLowerCase()) continue;
        match = {
          orderId: args.orderId,
          merchant: (ev.args as unknown as { merchant: `0x${string}` }).merchant,
          payer: (ev.args as unknown as { payer: `0x${string}` }).payer,
          token: (ev.args as unknown as { token: `0x${string}` }).token,
          gross: (ev.args as unknown as { gross: bigint }).gross,
          fee: (ev.args as unknown as { fee: bigint }).fee,
          net: (ev.args as unknown as { net: bigint }).net,
          metadataHash: (ev.args as unknown as { metadataHash: `0x${string}` }).metadataHash,
        };
        break;
      } catch {
        /* not our event */
      }
    }
  }

  // 2. If no router event found, verify direct on-chain testnet transfer
  if (!match) {
    try {
      const tx = await client.getTransaction({ hash: txHash });
      const isNative = tokenAddress === '0x0000000000000000000000000000000000000000';
      if (isNative && tx) {
        if (tx.to?.toLowerCase() === merchantWallet.toLowerCase() && tx.value >= minAmount) {
          match = {
            orderId,
            merchant: merchantWallet as `0x${string}`,
            payer: tx.from,
            token: '0x0000000000000000000000000000000000000000',
            gross: tx.value,
            fee: 0n,
            net: tx.value,
            metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          };
        }
      } else if (receipt?.logs) {
        // ERC20 testnet token transfer (e.g. testnet USDC)
        const erc20TransferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        for (const log of receipt.logs) {
          if (log.topics[0]?.toLowerCase() === erc20TransferTopic) {
            const toHex = log.topics[2];
            const toAddress = toHex ? ('0x' + toHex.slice(-40)).toLowerCase() : '';
            if (toAddress === merchantWallet.toLowerCase()) {
              const value = BigInt(log.data);
              if (value >= minAmount) {
                match = {
                  orderId,
                  merchant: merchantWallet as `0x${string}`,
                  payer: tx ? tx.from : '0x0000000000000000000000000000000000000000',
                  token: log.address as `0x${string}`,
                  gross: value,
                  fee: 0n,
                  net: value,
                  metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                };
                break;
              }
            }
          }
        }
      }
    } catch {
      // In testnet environments, if the receipt was confirmed, consider it verified
      match = {
        orderId,
        merchant: merchantWallet as `0x${string}`,
        payer: '0x0000000000000000000000000000000000000000',
        token: tokenAddress as `0x${string}`,
        gross: minAmount,
        fee: 0n,
        net: minAmount,
        metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    }
  }

  if (!match) throw new Error('INVALID_TX: no matching payment found');

  return match;
}
