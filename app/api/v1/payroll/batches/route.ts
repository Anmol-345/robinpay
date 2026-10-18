// =============================================================================
// app/api/v1/payroll/batches/route.ts
// =============================================================================
// Validates a payroll CSV and returns chunks for the client to sign and send.
// Nothing is persisted server-side. The client sends batchPayToken /
// batchPayNative per chunk from the user's wallet.
// Auth: sk_ key.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parse } from 'papaparse';
import { isAddress, keccak256, toHex, parseUnits } from 'viem';
import { getToken } from '@/lib/chain/tokens';
import { checkInvoiceRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 200;

const Body = z.object({
  batchId: z.string().min(1),
  merchant: z.string().refine((v) => isAddress(v), 'Invalid merchant address'),
  token: z.enum(['USDC', 'ETH']),
  csv: z.string().min(1),
});

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  // Rate limit by IP + merchant
  const ip = getClientIp(req);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('BAD_REQUEST', parsed.error.message);
  const { batchId, merchant: merchantParam, token: tokenSymbol, csv } = parsed.data;

  const merchantLimit = checkInvoiceRateLimit(ip, merchantParam);
  if (!merchantLimit.allowed) {
    return fail(
      'RATE_LIMITED',
      `Too many payroll requests for this merchant. Retry after ${merchantLimit.retryAfter}s`,
      429,
    );
  }

  const token = getToken(tokenSymbol);
  if (!token) return fail('TOKEN_NOT_SUPPORTED', 'Token not supported', 400);

  const rows = parse(csv, { header: true, skipEmptyLines: true }).data as Array<{
    recipient?: string;
    amount?: string;
    memo?: string;
  }>;

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

  // Chunk into batches of MAX_RECIPIENTS.
  const chunks: Array<{ chunkIndex: number; recipients: `0x${string}`[]; amounts: bigint[] }> = [];
  for (let i = 0; i < items.length; i += MAX_RECIPIENTS) {
    const chunk = items.slice(i, i + MAX_RECIPIENTS);
    chunks.push({
      chunkIndex: chunks.length,
      recipients: chunk.map((c) => c.recipient),
      amounts: chunk.map((c) => c.amount),
    });
  }

  return NextResponse.json({
    batchId,
    token: token.symbol,
    tokenAddress: token.address,
    totalAmount: total.toString(),
    recipientCount: items.length,
    chunkCount: chunks.length,
    maxRecipients: MAX_RECIPIENTS,
    chunks: chunks.map((c) => ({
      chunkIndex: c.chunkIndex,
      batchId: keccak256(toHex(batchId + ':' + c.chunkIndex)) as string,
      recipientCount: c.recipients.length,
    })),
    // Client sends batchPayToken(batchId, token, recipients, amounts) per chunk
    // from the user's wallet; history is read from BatchExecuted/PayoutSent logs.
  });
}
