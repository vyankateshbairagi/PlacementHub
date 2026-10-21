import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Running safe non-destructive migration on Neon PostgreSQL...');

  // 1. Extend Assessment table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Assessment" 
      ALTER COLUMN "skillId" DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS "slug" TEXT,
      ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'TECHNICAL_MCQ',
      ADD COLUMN IF NOT EXISTS "difficulty" TEXT DEFAULT 'MEDIUM',
      ADD COLUMN IF NOT EXISTS "totalMarks" INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS "passingMarks" INTEGER DEFAULT 60,
      ADD COLUMN IF NOT EXISTS "skillsCovered" TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "isMandatory" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "targetBatch" TEXT DEFAULT '2026 Batch',
      ADD COLUMN IF NOT EXISTS "instructions" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  `);
  console.log('✅ Assessment table updated');

  // 2. Extend AssessmentQuestion table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AssessmentQuestion"
      ADD COLUMN IF NOT EXISTS "title" TEXT,
      ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'MCQ',
      ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "marks" INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS "negativeMarks" DOUBLE PRECISION DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS "codingProblemId" TEXT,
      ADD COLUMN IF NOT EXISTS "starterCode" TEXT,
      ADD COLUMN IF NOT EXISTS "testCases" TEXT,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
  `);
  console.log('✅ AssessmentQuestion table updated');

  // 3. Extend AssessmentAttempt table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AssessmentAttempt"
      ADD COLUMN IF NOT EXISTS "maxScore" INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS "percentage" DOUBLE PRECISION DEFAULT 0.0,
      ADD COLUMN IF NOT EXISTS "percentile" DOUBLE PRECISION DEFAULT 85.0,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'COMPLETED',
      ADD COLUMN IF NOT EXISTS "proctorLogs" TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "summary" TEXT,
      ADD COLUMN IF NOT EXISTS "timeSpentSeconds" INTEGER DEFAULT 0;
  `);
  console.log('✅ AssessmentAttempt table updated');

  // 4. Create LearningRoadmap table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LearningRoadmap" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "category" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerBadge" TEXT NOT NULL,
      "badgeColor" TEXT NOT NULL DEFAULT 'blue',
      "description" TEXT NOT NULL,
      "totalItems" INTEGER NOT NULL DEFAULT 100,
      "estimatedHours" INTEGER NOT NULL DEFAULT 40,
      "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
      "tags" TEXT NOT NULL DEFAULT '[]',
      "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ LearningRoadmap table created/verified');

  // 5. Create LearningModule table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LearningModule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "roadmapId" TEXT NOT NULL REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "orderIndex" INTEGER NOT NULL DEFAULT 0,
      "totalItems" INTEGER NOT NULL DEFAULT 10,
      "topics" TEXT NOT NULL DEFAULT '[]',
      "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ LearningModule table created/verified');

  // 6. Create StudentRoadmapProgress table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudentRoadmapProgress" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "roadmapId" TEXT NOT NULL REFERENCES "LearningRoadmap"("id") ON DELETE CASCADE,
      "studentProfileId" TEXT NOT NULL REFERENCES "StudentProfile"("id") ON DELETE CASCADE,
      "completedItems" INTEGER NOT NULL DEFAULT 0,
      "completedTopicIds" TEXT NOT NULL DEFAULT '[]',
      "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "lastActivityAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "StudentRoadmapProgress_student_roadmap_unique" UNIQUE ("studentProfileId", "roadmapId")
    );
  `);
  console.log('✅ StudentRoadmapProgress table created/verified');

  console.log('🎉 Neon PostgreSQL Migration Completed Successfully!');
}

run()
  .catch((e) => {
    console.error('❌ Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
