// =============================================================================
// app/api/auth/nonce/route.ts — Stateless SIWE nonce
// =============================================================================
// Returns a stateless, HMAC-signed nonce for the given address.
// Query: ?address=0x...
// No storage required — the nonce embeds the address and timestamp, signed
// with HMAC(SESSION_SECRET). Valid for 5 minutes.
import { isAddress } from 'viem';
import { createNonce } from '@/lib/auth/nonce';
import { jsonWithCorsPublic } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fail = (code: string, message: string, status = 400) =>
  jsonWithCorsPublic({ error: { code, message } }, { status });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address || !isAddress(address)) {
    return fail('INVALID_ADDRESS', 'Valid merchant address required', 400);
  }

  const nonce = createNonce(address);
  const issuedAt = new Date().toISOString();

  return jsonWithCorsPublic({
    nonce,
    address: address.toLowerCase(),
    issuedAt,
    chainId: 4663,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
}
