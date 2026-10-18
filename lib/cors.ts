// =============================================================================
// lib/cors.ts — CORS helpers (no database)
// =============================================================================
// Public endpoints allow any origin but never reflect credentials.
// SIWE-protected endpoints allow only the app origin.
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// SSRF protection: check that URL is HTTPS and not pointing to private/loopback/link-local.
export function isSsrSafeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Only HTTPS allowed.
  if (parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase().replace(/[\[\]]/g, '');

  // Block loopback.
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;

  // Block link-local (169.254.x.x).
  if (host.startsWith('169.254.')) return false;

  // Block private ranges (RFC 1918): 10.x.x.x, 172.16-31.x.x, 192.168.x.x.
  if (host.startsWith('10.')) return false;
  if (host.startsWith('172.')) {
    const second = parseInt(host.split('.')[1] || '0', 10);
    if (second >= 16 && second <= 31) return false;
  }
  if (host.startsWith('192.168.')) return false;

  // Block link-local IPv6 (fe80::).
  if (host.startsWith('fe80:')) return false;

  // Block unique local IPv6 (fc00::/7).
  if (host.startsWith('fc00:') || host.startsWith('fd')) return false;

  return true;
}

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

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeadersPublic() });
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
