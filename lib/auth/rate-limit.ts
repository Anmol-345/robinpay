// =============================================================================
// lib/auth/rate-limit.ts — Per-key / per-IP rate limiting placeholder
// =============================================================================
// Wire this to Upstash Redis (or similar) in production. In-memory here keeps
// the dependency surface small for a single-server / serverless deployment.
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let window = windows.get(key);
  if (!window || now > window.resetAt) {
    window = { count: 0, resetAt: now + windowMs };
    windows.set(key, window);
  }
  window.count += 1;
  return { allowed: window.count <= limit, remaining: Math.max(0, limit - window.count) };
}
