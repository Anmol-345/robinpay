// =============================================================================
// app/api/v1/payroll/batches/route.ts
// =============================================================================
// Parses a payroll CSV, validates recipients, chunks by MAX_RECIPIENTS, and
// returns calldata for the merchant wallet to sign (one tx per chunk).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parse } from 'papaparse';
import { isAddress, keccak256, toHex, parseUnits } from 'viem';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth/api-keys';
import { getToken } from '@/lib/chain/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 200;

const Body = z.object({
  batchId: z.string().min(1),
  token: z.enum(['USDC', 'ETH']),
  csv: z.string().min(1),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const auth = await authenticate(req, { requireSecret: true });
  if (!auth) return fail('UNAUTHORIZED', 'Invalid API key', 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { batchId, token: tokenSymbol, csv } = parsed.data;

  const token = getToken(tokenSymbol);
  if (!token) return fail('TOKEN_NOT_SUPPORTED', 'Token not supported', 400);

  const rows = parse(csv, { header: true, skipEmptyLines: true }).data as Array<{ recipient?: string; amount?: string; memo?: string }>;

  const seen = new Set<string>();
  const items: Array<{ recipient: `0x${string}`; amount: bigint; memo: string }> = [];
  let total = 0n;

  for (const row of rows) {
    const recipient = String(row.recipient ?? '').trim();
    const amount = String(row.amount ?? '').trim();
    const memo = String(row.memo ?? '');

    if (!recipient || !isAddress(recipient)) return fail('INVALID_RECIPIENT', `Invalid address: ${recipient}`, 400);
    if (seen.has(recipient.toLowerCase())) return fail('DUPLICATE_RECIPIENT', `Duplicate recipient: ${recipient}`, 400);
    seen.add(recipient.toLowerCase());

    const parsedAmount = parseUnits(amount, token.decimals);
    if (parsedAmount <= 0n) return fail('ZERO_AMOUNT', `Amount must be positive for ${recipient}`, 400);

    items.push({ recipient: recipient as `0x${string}`, amount: parsedAmount, memo });
    total += parsedAmount;
  }

  if (items.length === 0) return fail('EMPTY_BATCH', 'No valid payout items', 400);

  // Create the batch record
  const batch = await prisma.payrollBatch.create({
    data: {
      id: batchId,
      merchantId: auth.merchantId,
      label: batchId,
      tokenAddress: token.address,
      totalAmount: total.toString(),
      status: 'DRAFT',
    },
  });

  // Chunk into batches of MAX_RECIPIENTS
  const chunks: Array<{ chunkIndex: number; recipients: `0x${string}`[]; amounts: bigint[] }> = [];
  for (let i = 0; i < items.length; i += MAX_RECIPIENTS) {
    const chunk = items.slice(i, i + MAX_RECIPIENTS);
    chunks.push({
      chunkIndex: chunks.length,
      recipients: chunk.map((c) => c.recipient),
      amounts: chunk.map((c) => c.amount),
    });
  }

  for (const chunk of chunks) {
    await prisma.payrollItem.createMany({
      data: chunk.recipients.map((recipient, i) => ({
        id: `${batchId}-${chunk.chunkIndex}-${i}`,
        batchId: batch.id,
        chunkIndex: chunk.chunkIndex,
        recipient: recipient.toLowerCase(),
        amount: chunk.amounts[i].toString(),
        memo: items.find((it) => it.recipient.toLowerCase() === recipient.toLowerCase())?.memo ?? '',
        status: 'DRAFT',
      })),
    });
  }

  return NextResponse.json({
    batchId: batch.id,
    token: token.symbol,
    totalAmount: total.toString(),
    recipientCount: items.length,
    chunkCount: chunks.length,
    chunks: chunks.map((c) => ({
      chunkIndex: c.chunkIndex,
      batchId: keccak256(toHex(batchId + ':' + c.chunkIndex)) as string,
      recipientCount: c.recipients.length,
    })),
    // Frontend signs batchPayToken(batchId, token, recipients, amounts) per chunk
  });
}
