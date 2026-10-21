const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const stmts = [
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "skills" TEXT DEFAULT '[]'`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "careerReadinessScore" INTEGER DEFAULT 78`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "trustScore" INTEGER DEFAULT 75`,
  `ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "verifiedSkillsCount" INTEGER DEFAULT 0`
];

async function main() {
  await client.connect();
  for (const s of stmts) {
    await client.query(s);
  }
  console.log('✅ StudentProfile missing columns added successfully!');
  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});
