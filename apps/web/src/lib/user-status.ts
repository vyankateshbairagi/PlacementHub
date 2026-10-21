import prisma from '@/lib/db';

// The deployed Neon schema predates `isActive` and some adjacent services still
// read `active`. Keep both flags aligned while those services migrate.
export async function syncLegacyActiveFlag(userId: string, isActive: boolean) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'active'
    ) AS exists
  `;
  if (rows[0]?.exists) {
    await prisma.$executeRaw`UPDATE "User" SET "active" = ${isActive} WHERE "id" = ${userId}`;
  }
}

