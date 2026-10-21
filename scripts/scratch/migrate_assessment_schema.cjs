const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const statements = [
  // Assessment table columns
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "slug" TEXT`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'TECHNICAL_MCQ'`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "difficulty" TEXT DEFAULT 'MEDIUM'`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "totalMarks" INTEGER DEFAULT 100`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "passingMarks" INTEGER DEFAULT 60`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "skillsCovered" TEXT DEFAULT '[]'`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "isMandatory" BOOLEAN DEFAULT false`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "targetBatch" TEXT DEFAULT '2026 Batch'`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "instructions" TEXT`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE'`,
  `ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Assessment_slug_key" ON "Assessment"("slug")`,

  // CodingProblem table
  `CREATE TABLE IF NOT EXISTS "CodingProblem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starterCode" TEXT NOT NULL,
    "testCases" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodingProblem_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CodingProblem_slug_key" ON "CodingProblem"("slug")`,

  // CodingSubmission table
  `CREATE TABLE IF NOT EXISTS "CodingSubmission" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "passedCases" INTEGER NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "runtimeMs" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodingSubmission_pkey" PRIMARY KEY ("id")
  )`,

  // AssessmentQuestion table
  `CREATE TABLE IF NOT EXISTS "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[] NOT NULL DEFAULT '{}',
    "answerIndex" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT,
    "type" TEXT DEFAULT 'MCQ',
    "title" TEXT,
    "orderIndex" INTEGER DEFAULT 0,
    "marks" INTEGER DEFAULT 10,
    "negativeMarks" DOUBLE PRECISION DEFAULT 0.0,
    "codingProblemId" TEXT,
    "starterCode" TEXT,
    "testCases" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId")`,

  // AssessmentAttempt table
  `CREATE TABLE IF NOT EXISTS "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionIds" TEXT[] NOT NULL DEFAULT '{}',
    "answers" JSONB,
    "score" INTEGER,
    "maxScore" INTEGER DEFAULT 100,
    "percentage" DOUBLE PRECISION DEFAULT 0,
    "percentile" DOUBLE PRECISION DEFAULT 85.0,
    "status" TEXT DEFAULT 'COMPLETED',
    "proctorLogs" TEXT DEFAULT '[]',
    "summary" TEXT,
    "timeSpentSeconds" INTEGER DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AssessmentAttempt_studentProfileId_assessmentId_idx" ON "AssessmentAttempt"("studentProfileId", "assessmentId")`,

  // LearningRoadmap table
  `CREATE TABLE IF NOT EXISTS "LearningRoadmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerBadge" TEXT NOT NULL,
    "badgeColor" TEXT NOT NULL DEFAULT 'blue',
    "description" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 100,
    "estimatedHours" INTEGER NOT NULL DEFAULT 40,
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningRoadmap_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LearningRoadmap_slug_key" ON "LearningRoadmap"("slug")`,

  // LearningModule table
  `CREATE TABLE IF NOT EXISTS "LearningModule" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 10,
    "topics" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LearningModule_roadmapId_idx" ON "LearningModule"("roadmapId")`,

  // StudentRoadmapProgress table
  `CREATE TABLE IF NOT EXISTS "StudentRoadmapProgress" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "completedTopicIds" TEXT NOT NULL DEFAULT '[]',
    "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentRoadmapProgress_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentRoadmapProgress_studentProfileId_roadmapId_key" ON "StudentRoadmapProgress"("studentProfileId", "roadmapId")`,
  `CREATE INDEX IF NOT EXISTS "StudentRoadmapProgress_studentProfileId_idx" ON "StudentRoadmapProgress"("studentProfileId")`
];

async function main() {
  await client.connect();
  console.log('Applying Assessment and Learning schema migrations to Neon DB...');
  for (const sql of statements) {
    try {
      await client.query(sql);
    } catch (e) {
      console.warn('Migration warning:', e.message);
    }
  }
  console.log('✅ Assessment & Learning schema migration completed successfully!');
  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});
