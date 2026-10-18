// =============================================================================
// app/api/auth/session/route.ts — SIWE login + signed httpOnly session cookie
// =============================================================================
// Sign-In with Ethereum. The merchant connects a wallet, signs a SIWE message,
// and receives a signed httpOnly session cookie (rp_session). No database is
// involved; the cookie is self-validating via HMAC.
import { NextResponse } from 'next/server';
import { verifyMessage, type Hex } from 'viem';
import { z } from 'zod';
import { buildSiweMessage, setSessionCookie } from '@/lib/auth/siwe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL ?? 'localhost:3000';
const HOST = DOMAIN.replace(/^https?:\/\//, '');

const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

// GET: return a nonce + domain for the client to build a SIWE message.
export async function GET() {
  const nonce = crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  return NextResponse.json({
    nonce,
    domain: HOST,
    chainId: 4663,
    issuedAt,
    message: buildSiweMessage({
      address: '0x', // placeholder; client fills in
      chainId: 4663,
      nonce,
      issuedAt,
      domain: HOST,
    }),
  });
}

// POST: verify SIWE signature, set signed httpOnly session cookie.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = z
    .object({
      message: z.string(),
      signature: z.string().refine((v): v is Hex => v.startsWith('0x') && v.length === 132),
    })
    .safeParse(body);
  if (!parsed.success) return fail('BAD_REQUEST', 'Invalid SIWE payload', 400);

  const { message, signature } = parsed.data;

  // The signer address is embedded in the SIWE message (2nd line).
  const lines = message.split('\n');
  const addressLine = lines[1]?.trim();
  if (!addressLine || !addressLine.startsWith('0x')) {
    return fail('INVALID_MESSAGE', 'SIWE message missing address', 401);
  }

  // Recover / confirm the signer by verifying the signature against the address.
  let isValid = false;
  try {
    isValid = await verifyMessage({
      address: addressLine as `0x${string}`,
      message,
      signature,
    });
  } catch {
    isValid = false;
  }
  if (!isValid) return fail('INVALID_SIGNATURE', 'SIWE signature verification failed', 401);

  const address = addressLine.toLowerCase() as `0x${string}`;

  // Minimal SIWE field validation.
  const domainLine = lines.find((l) => l.startsWith('URI: '));
  const chainLine = lines.find((l) => l.startsWith('Chain ID: '));
  if (!domainLine || !domainLine.includes(HOST)) {
    return fail('INVALID_MESSAGE', 'SIWE domain mismatch', 401);
  }
  if (!chainLine || !chainLine.includes('4663')) {
    return fail('INVALID_MESSAGE', 'SIWE chain must be Robinhood Chain (4663)', 401);
  }

  const session = { address: address.toLowerCase(), chainId: 4663, iat: Math.floor(Date.now() / 1000), nonce: crypto.randomUUID() };
  const cookieValue = setSessionCookie(session);

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

// DELETE: clear the session cookie.
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('rp_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
