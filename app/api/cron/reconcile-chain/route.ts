// =============================================================================
// app/api/cron/reconcile-chain/route.ts
// =============================================================================
// Vercel Cron: re-scans recent blocks for router events missed by the verify flow,
// so no payment is ever lost if a customer closes the tab before verifying.
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { decodeEventLog, type Hex } from 'viem';
import { publicClient } from '@/lib/chain/client';
import { ROUTER_ABI } from '@/lib/chain/client';
import { prisma } from '@/lib/db';
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from('Bearer ' + env().CRON_SECRET);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });

  const client = publicClient();
  const head = await client.getBlockNumber();
  const fromBlock = head - BigInt(100); // scan last 100 blocks each run

  const found = ROUTER_ABI.find((a) => a.type === 'event' && a.name === 'PaymentProcessed');
  if (!found) return NextResponse.json({ scanned: 0, reconciled: 0 });

  const logs = await client.getLogs({
    address: env().PAYMENT_ROUTER_ADDRESS as `0x${string}`,
    event: found as unknown as Extract<typeof ROUTER_ABI[number], { type: 'event' }>,
    fromBlock,
    toBlock: head,
  });

  let reconciled = 0;
  for (const log of logs) {
    const ev = decodeEventLog({
      abi: ROUTER_ABI,
      data: log.data as Hex,
      topics: log.topics as unknown as [] | [`0x${string}`, ...`0x${string}`[]],
    });
    if (ev.eventName !== 'PaymentProcessed') continue;
    const args = ev.args as unknown as PaymentProcessedArgs;

    const existing = await prisma.payment.findUnique({
      where: { txHash_logIndex: { txHash: log.transactionHash, logIndex: log.logIndex } },
    });
    if (existing) continue;

    // Match orderId to an invoice
    const invoice = await prisma.invoice.findFirst({
      where: { orderId: args.orderId, status: 'UNPAID' },
    });
    if (!invoice) continue;

    const merchantWallet = (
      await prisma.merchant.findUniqueOrThrow({ where: { id: invoice.merchantId } })
    ).walletAddress;
    if (args.merchant.toLowerCase() !== merchantWallet.toLowerCase()) continue;
    if (args.token.toLowerCase() !== invoice.tokenAddress.toLowerCase()) continue;
    if (args.gross < BigInt(invoice.amount.toFixed(0))) continue;

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
        payer: args.payer.toLowerCase(),
        gross: args.gross.toString(),
        fee: args.fee.toString(),
        net: args.net.toString(),
      },
    });
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', paidAt: new Date() } });
    reconciled += 1;
  }

  return NextResponse.json({ scanned: logs.length, reconciled });
}
