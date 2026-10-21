import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let connectionUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (connectionUrl && connectionUrl.includes('-pooler') && !connectionUrl.includes('pgbouncer=true')) {
  connectionUrl += connectionUrl.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: connectionUrl ? { db: { url: connectionUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
