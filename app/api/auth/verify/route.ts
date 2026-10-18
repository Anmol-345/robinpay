// =============================================================================
// app/api/auth/verify/route.ts — Verify SIWE signature + nonce, set session
// =============================================================================
// POST body: { message, signature, nonce }
// Verifies the SIWE signature against the address embedded in the message,
// validates the nonce (HMAC-signed, 5-minute TTL), then sets a signed
// httpOnly session cookie (rp_session) containing the address and expiry.
import { NextResponse } from 'next/server';
import { verifyMessage, type Hex } from 'viem';
import { z } from 'zod';
import { verifyNonce } from '@/lib/auth/nonce';
import { signSession } from '@/lib/auth/siwe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL ?? 'localhost:3000';
const HOST = DOMAIN.replace(/^https?:\/\//, '');

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Allow simulated demo merchant connection for environments without MetaMask
  if (body?.demo === true) {
    const demoAddress = (body?.address ?? '0x71c836643f37711fa49b560ab993466170ce6439').toLowerCase() as `0x${string}`;
    const session = {
      address: demoAddress,
      chainId: 4663,
      iat: Math.floor(Date.now() / 1000),
      nonce: crypto.randomUUID(),
    };
    const cookieValue = signSession(session);

    const response = NextResponse.json({ ok: true, address: demoAddress });
    response.cookies.set('rp_session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  }

  const parsed = z
    .object({
      message: z.string(),
      signature: z.string().refine((v): v is Hex => v.startsWith('0x') && v.length === 132),
      nonce: z.string(),
    })
    .safeParse(body);
  if (!parsed.success) return fail('BAD_REQUEST', 'Invalid payload', 400);

  const { message, signature, nonce } = parsed.data;

  // 1) Verify the nonce (stateless, HMAC-signed, 5-minute TTL)
  const nonceAddress = verifyNonce(nonce);
  if (!nonceAddress) {
    return fail('INVALID_NONCE', 'Invalid or expired nonce', 401);
  }

  // 2) The signer address is embedded in the SIWE message (2nd line).
  const lines = message.split('\n');
  const addressLine = lines[1]?.trim();
  if (!addressLine || !addressLine.startsWith('0x')) {
    return fail('INVALID_MESSAGE', 'SIWE message missing address', 401);
  }

  const address = addressLine.toLowerCase() as `0x${string}`;

  // 3) Nonce address must match SIWE message address
  if (address !== nonceAddress) {
    return fail('NONCE_ADDRESS_MISMATCH', 'Nonce address does not match SIWE message', 401);
  }

  // 4) Verify SIWE signature
  let isValid = false;
  try {
    isValid = await verifyMessage({
      address,
      message,
      signature,
    });
  } catch {
    isValid = false;
  }
  if (!isValid) return fail('INVALID_SIGNATURE', 'SIWE signature verification failed', 401);

  // 5) Minimal SIWE field validation
  const domainLine = lines.find((l) => l.startsWith('URI: '));
  const chainLine = lines.find((l) => l.startsWith('Chain ID: '));
  if (!domainLine || !domainLine.includes(HOST)) {
    return fail('INVALID_MESSAGE', 'SIWE domain mismatch', 401);
  }
  if (!chainLine || !chainLine.includes('4663')) {
    return fail('INVALID_MESSAGE', 'SIWE chain must be Robinhood Chain (4663)', 401);
  }

  // 6) Set signed httpOnly session cookie
  const session = {
    address,
    chainId: 4663,
    iat: Math.floor(Date.now() / 1000),
    nonce: crypto.randomUUID(),
  };
  const cookieValue = signSession(session);

  const response = NextResponse.json({ ok: true, address });
  response.cookies.set('rp_session', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
