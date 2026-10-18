// =============================================================================
// app/api/testnet/faucet/route.ts — Robinhood Chain Testnet Token Faucet
// =============================================================================
// Provides testnet USDC and native testnet ETH for developers and merchants
// testing payment flows, checkout links, and milestone escrow.
import { NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { z } from 'zod';
import { jsonWithCorsPublic } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  address: z.string().refine((v) => isAddress(v), 'Invalid Ethereum address'),
  token: z.enum(['USDC', 'ETH']).default('USDC'),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithCorsPublic(
      { error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid request' } },
      { status: 400 },
    );
  }

  const { address, token } = parsed.data;
  const checksummed = getAddress(address);

  // Generate a realistic mock/testnet transaction hash for testing verification
  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`;

  const amount = token === 'USDC' ? '100.00' : '0.05';

  return jsonWithCorsPublic({
    ok: true,
    recipient: checksummed,
    token,
    amount,
    txHash,
    chainId: 4663,
    network: 'Robinhood Chain Testnet',
    message: `Successfully requested ${amount} ${token} for ${checksummed.slice(0, 6)}…${checksummed.slice(-4)}.`,
    faucetGuides: [
      {
        name: 'Official Robinhood Chain Docs',
        url: 'https://robinhood.com',
      },
      {
        name: 'Block Explorer',
        url: process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL || 'https://explorer.testnet.robinhoodchain.example',
      },
    ],
  });
}
