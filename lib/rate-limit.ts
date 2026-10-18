// =============================================================================
// lib/rate-limit.ts — In-memory rate limiting by IP and merchant address
// =============================================================================
// Stateless, in-memory rate limiter for local/dev usage. In production, swap
// this for Upstash Ratelimit (Redis-backed). No database, no ORM, no file store.
interface Window {
  count: number;
  resetAt: number;
}

// Per-IP windows (keyed by IP address string)
const ipWindows = new Map<string, Window>();
// Per-merchant windows (keyed by lowercase 0x address)
const merchantWindows = new Map<string, Window>();

function getWindow(
  store: Map<string, Window>,
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  let w = store.get(key);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    store.set(key, w);
  }
  w.count += 1;
  const remaining = Math.max(0, limit - w.count);
  if (w.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((w.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining };
}

// Rate limits:
//   Invoice creation: 30/min per IP
//   Verify: 120/min per IP
//   Events: 60/min per IP
export function checkInvoiceRateLimit(ip: string, merchant?: string) {
  const ipResult = getWindow(ipWindows, ip, 30, 60_000);
  if (!ipResult.allowed) return ipResult;
  if (merchant) {
    return getWindow(merchantWindows, `invoice:${merchant.toLowerCase()}`, 30, 60_000);
  }
  return ipResult;
}

export function checkVerifyRateLimit(ip: string) {
  return getWindow(ipWindows, `verify:${ip}`, 120, 60_000);
}

export function checkEventsRateLimit(ip: string, merchant?: string) {
  const ipResult = getWindow(ipWindows, `events:${ip}`, 60, 60_000);
  if (!ipResult.allowed) return ipResult;
  if (merchant) {
    return getWindow(merchantWindows, `events:${merchant.toLowerCase()}`, 60, 60_000);
  }
  return ipResult;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
