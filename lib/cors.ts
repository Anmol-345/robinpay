// =============================================================================
// lib/cors.ts — CORS helpers (no database)
// =============================================================================
// Public endpoints allow any origin but never reflect credentials.
// SIWE-protected endpoints allow only the app origin.
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function corsHeadersPublic(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
  };
}

export function corsHeadersAppOrigin(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function optionsResponse(headers: Record<string, string>): Response {
  return new Response(null, { status: 204, headers });
}

export function jsonWithCorsPublic(
  body: unknown,
  init?: { status?: number },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeadersPublic(),
    },
  });
}

export function jsonWithCorsApp(
  body: unknown,
  init?: { status?: number },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeadersAppOrigin(),
    },
  });
}
