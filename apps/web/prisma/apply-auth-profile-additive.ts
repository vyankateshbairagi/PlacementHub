import { PrismaClient } from '@prisma/client';

const connectionUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: connectionUrl ? { db: { url: connectionUrl } } : undefined });

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED'`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "showEmailPublic" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "showPhonePublic" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "showAcademicsPublic" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "showProjectsPublic" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "showExperiencePublic" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "showResumePublic" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "StudentExperience" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "StudentProject" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false`,
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'active') THEN
      EXECUTE 'UPDATE "User" SET "isActive" = "active"';
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "StudentEducation" (
    "id" TEXT NOT NULL, "studentProfileId" TEXT NOT NULL, "institutionName" TEXT NOT NULL,
    "qualification" TEXT NOT NULL, "fieldOfStudy" TEXT, "startYear" INTEGER NOT NULL,
    "endYear" INTEGER, "score" TEXT, "description" TEXT, "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentEducation_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "ProfileVerificationRequest" (
    "id" TEXT NOT NULL, "studentProfileId" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT,
    "fieldName" TEXT, "evidenceUrl" TEXT, "note" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT, "rejectionReason" TEXT, "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileVerificationRequest_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "AuthSession" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userAgent" TEXT, "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "AuthToken" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "AuthInvitation" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "role" "Role" NOT NULL, "institutionId" TEXT,
    "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthInvitation_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentEducation_studentProfileId_idx" ON "StudentEducation"("studentProfileId")`,
  `CREATE INDEX IF NOT EXISTS "ProfileVerificationRequest_studentProfileId_status_idx" ON "ProfileVerificationRequest"("studentProfileId", "status")`,
  `CREATE INDEX IF NOT EXISTS "ProfileVerificationRequest_reviewerId_idx" ON "ProfileVerificationRequest"("reviewerId")`,
  `CREATE INDEX IF NOT EXISTS "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "AuthToken_userId_type_expiresAt_idx" ON "AuthToken"("userId", "type", "expiresAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AuthInvitation_tokenHash_key" ON "AuthInvitation"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "AuthInvitation_email_expiresAt_idx" ON "AuthInvitation"("email", "expiresAt")`,
];

const foreignKeys = [
  ['StudentEducation_studentProfileId_fkey', `ALTER TABLE "StudentEducation" ADD CONSTRAINT "StudentEducation_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ['ProfileVerificationRequest_studentProfileId_fkey', `ALTER TABLE "ProfileVerificationRequest" ADD CONSTRAINT "ProfileVerificationRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ['ProfileVerificationRequest_reviewerId_fkey', `ALTER TABLE "ProfileVerificationRequest" ADD CONSTRAINT "ProfileVerificationRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
  ['AuthSession_userId_fkey', `ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ['AuthToken_userId_fkey', `ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ['AuthInvitation_institutionId_fkey', `ALTER TABLE "AuthInvitation" ADD CONSTRAINT "AuthInvitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ['AuthInvitation_createdById_fkey', `ALTER TABLE "AuthInvitation" ADD CONSTRAINT "AuthInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
] as const;

async function main() {
  for (const sql of statements) await prisma.$executeRawUnsafe(sql);
  for (const [name, sql] of foreignKeys) {
    const exists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS exists`, name,
    );
    if (!exists[0]?.exists) await prisma.$executeRawUnsafe(sql);
  }
  const result = await prisma.user.updateMany({
    where: { emailVerifiedAt: null, passwordHash: { not: null } },
    data: { emailVerifiedAt: new Date() },
  });
  console.log(`Auth/profile additive migration complete; grandfathered ${result.count} password-backed account(s).`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(async () => prisma.$disconnect());

