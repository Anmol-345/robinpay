// =============================================================================
// lib/db.ts — Prisma singleton
// =============================================================================
// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// the database connection pool. DATABASE_URL is validated by lib/env.ts.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
