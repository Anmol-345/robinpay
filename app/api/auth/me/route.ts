// =============================================================================
// app/api/auth/me/route.ts — Get authenticated merchant session info
// =============================================================================
// Returns the SIWE session's merchant address so the dashboard can display it
// and generate API keys. The session cookie is httpOnly, so this is the only
// way for the client to learn the authenticated merchant.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/siwe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('rp_session')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    address: session.address,
    chainId: session.chainId,
    iat: session.iat,
  });
}
