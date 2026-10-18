// =============================================================================
// app/api/auth/me/route.ts — Get authenticated merchant session info
// =============================================================================
// Returns the SIWE session's merchant address so the dashboard can display it.
// The session cookie is httpOnly, so this is the only way for the client to
// learn the authenticated merchant.
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/siwe';
import { jsonWithCorsApp } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('rp_session')?.value;
  if (!token) {
    return jsonWithCorsApp({ authenticated: false }, { status: 401 });
  }

  const session = verifySession(token);
  if (!session) {
    return jsonWithCorsApp({ authenticated: false }, { status: 401 });
  }

  return jsonWithCorsApp({
    authenticated: true,
    address: session.address,
    chainId: session.chainId,
    iat: session.iat,
  });
}
