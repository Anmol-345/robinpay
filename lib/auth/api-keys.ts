// =============================================================================
// lib/auth/api-keys.ts — API key lifecycle (pk_ / sk_)
// =============================================================================
// pk_* : browser-safe, identifies the merchant, checkout sessions only, not a secret
// sk_* : server-side full access, stored as SHA-256 hash only, shown once at creation
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

type Env = 'live' | 'test';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createApiKeyPair(merchantId: string, env: Env, label?: string) {
  const publicKey = 'pk_' + env + '_' + randomBytes(16).toString('base64url');
  const secret = 'sk_' + env + '_' + randomBytes(32).toString('base64url');

  await prisma.apiKey.create({
    data: {
      merchantId,
      environment: env === 'live' ? 'LIVE' : 'TEST',
      label,
      publicKey,
      secretHash: sha256(secret),
      secretLast4: secret.slice(-4),
      scopes: ['invoices:write', 'payments:read', 'webhooks:write'],
    },
  });

  // Return the plaintext secret ONCE; it cannot be recovered later.
  return { publicKey, secret };
}

export interface AuthResult {
  merchantId: string;
  environment: 'LIVE' | 'TEST';
  scopes: string[];
  isSecret: boolean;
}

export async function authenticate(
  req: Request,
  opts: { requireSecret?: boolean } = {},
): Promise<AuthResult | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const isSecret = token.startsWith('sk_');
  if (opts.requireSecret && !isSecret) return null;

  const key = await prisma.apiKey.findFirst({
    where: isSecret ? { secretHash: sha256(token) } : { publicKey: token },
    select: { id: true, merchantId: true, environment: true, revokedAt: true, scopes: true },
  });
  if (!key || key.revokedAt) return null;

  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return {
    merchantId: key.merchantId,
    environment: key.environment,
    scopes: key.scopes,
    isSecret,
  };
}
