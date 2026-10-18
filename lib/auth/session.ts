// =============================================================================
// lib/auth/session.ts — Short-lived checkout sessions (browser-safe)
// =============================================================================
// pk_ key holders create a checkout session to bind a payer to an invoice.
// The session is short-lived and origin-restricted.
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';

export async function createCheckoutSession({
  merchantId,
  invoiceId,
  origin,
  ttlMs = 10 * 60 * 1000, // 10 minutes
}: {
  merchantId: string;
  invoiceId: string;
  origin: string;
  ttlMs?: number;
}) {
  const token = 'rp_sess_' + randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.checkoutSession.create({
    data: {
      token,
      merchantId,
      invoiceId,
      origin,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function validateCheckoutSession(token: string) {
  const session = await prisma.checkoutSession.findUnique({
    where: { token },
    select: { id: true, invoiceId: true, merchantId: true, usedAt: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.usedAt) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export async function markSessionUsed(token: string) {
  await prisma.checkoutSession.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}
