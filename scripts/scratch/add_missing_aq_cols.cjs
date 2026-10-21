const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const statements = [
  // AssessmentQuestion missing columns
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'MCQ'`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "title" TEXT`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER DEFAULT 0`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "marks" INTEGER DEFAULT 10`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "negativeMarks" DOUBLE PRECISION DEFAULT 0.0`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "codingProblemId" TEXT`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "starterCode" TEXT`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "testCases" TEXT`,
  `ALTER TABLE "AssessmentQuestion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,

  // AssessmentAttempt columns
  `ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "percentile" DOUBLE PRECISION DEFAULT 85.0`,
  `ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "proctorLogs" TEXT DEFAULT '[]'`,
  `ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "summary" TEXT`,
  `ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "timeSpentSeconds" INTEGER DEFAULT 0`
];

async function run() {
  await client.connect();
  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log('Executed:', sql.substring(0, 70));
    } catch (e) {
      console.warn('Notice:', e.message);
    }
  }
  console.log('✅ Done adding missing columns to AssessmentQuestion & AssessmentAttempt');
  await client.end();
}

run().catch(console.error);
