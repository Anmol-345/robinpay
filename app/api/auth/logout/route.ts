// =============================================================================
// app/api/auth/logout/route.ts — Clear session cookie
// =============================================================================
// DELETE clears the rp_session httpOnly cookie.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('rp_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
