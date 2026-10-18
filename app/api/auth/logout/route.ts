// =============================================================================
// app/api/auth/logout/route.ts — Clear session cookie
// =============================================================================
// DELETE clears the rp_session httpOnly cookie.
import { corsHeadersAppOrigin } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeadersAppOrigin(),
      'Set-Cookie': 'rp_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
    },
  });
  return response;
}
