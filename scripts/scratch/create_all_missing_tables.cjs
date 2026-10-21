const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const statements = [
  // 1. SkillProof
  `CREATE TABLE IF NOT EXISTS "SkillProof" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "canonicalSkill" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidenceTier" TEXT NOT NULL DEFAULT 'GOLD_VERIFIED',
    "sourceType" TEXT NOT NULL DEFAULT 'EVALUATED_PROJECT',
    "locator" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "auditNote" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillProof_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SkillProof_studentProfileId_canonicalSkill_idx" ON "SkillProof"("studentProfileId", "canonicalSkill")`,

  // 2. Resume
  `CREATE TABLE IF NOT EXISTS "Resume" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "fileUrl" TEXT,
    "atsScore" INTEGER NOT NULL DEFAULT 84,
    "targetRole" TEXT,
    "parsedData" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
  )`,

  // 3. PlacementDrive
  `CREATE TABLE IF NOT EXISTS "PlacementDrive" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "recruiterId" TEXT,
    "companyName" TEXT NOT NULL,
    "companyLogo" TEXT,
    "roleTitle" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'ON_CAMPUS',
    "jobCategory" TEXT NOT NULL DEFAULT 'TECH',
    "description" TEXT NOT NULL,
    "ctc" TEXT NOT NULL,
    "ctcAmount" DOUBLE PRECISION,
    "isDreamCompany" BOOLEAN NOT NULL DEFAULT false,
    "isSuperDream" BOOLEAN NOT NULL DEFAULT false,
    "requiredSkills" TEXT NOT NULL DEFAULT '[]',
    "preferredSkills" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'ON_CAMPUS',
    "stipend" TEXT,
    "location" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "driveDate" TIMESTAMP(3),
    "minCgpa" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "maxBacklogs" INTEGER NOT NULL DEFAULT 0,
    "eligibleBranches" TEXT NOT NULL DEFAULT '[]',
    "selectionRounds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlacementDrive_pkey" PRIMARY KEY ("id")
  )`,

  // 4. InterviewDebrief
  `CREATE TABLE IF NOT EXISTS "InterviewDebrief" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "candidateName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "roundType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "questionsAsked" TEXT NOT NULL,
    "tips" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewDebrief_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "InterviewDebrief_companyName_idx" ON "InterviewDebrief"("companyName")`,

  // 5. MentorshipSlot
  `CREATE TABLE IF NOT EXISTS "MentorshipSlot" (
    "id" TEXT NOT NULL,
    "alumniProfileId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT DEFAULT 'GENERAL',
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "date" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorshipSlot_pkey" PRIMARY KEY ("id")
  )`,

  // 6. MentorshipBooking
  `CREATE TABLE IF NOT EXISTS "MentorshipBooking" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "meetingLink" TEXT,
    "studentNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorshipBooking_pkey" PRIMARY KEY ("id")
  )`,

  // 7. MentorshipFeedback
  `CREATE TABLE IF NOT EXISTS "MentorshipFeedback" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "studentRating" INTEGER,
    "studentFeedback" TEXT,
    "mentorFeedback" TEXT,
    "actionItems" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorshipFeedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MentorshipFeedback_bookingId_key" UNIQUE ("bookingId")
  )`,

  // 8. MentorshipRequest
  `CREATE TABLE IF NOT EXISTS "MentorshipRequest" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "alumniProfileId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "preferredDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorshipRequest_pkey" PRIMARY KEY ("id")
  )`,

  // 9. ReferralPosting
  `CREATE TABLE IF NOT EXISTS "ReferralPosting" (
    "id" TEXT NOT NULL,
    "alumniProfileId" TEXT,
    "studentProfileId" TEXT,
    "postedByName" TEXT,
    "postedByEmail" TEXT,
    "company" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "experienceRequired" TEXT NOT NULL DEFAULT 'Freshers / 2026 Batch',
    "location" TEXT NOT NULL DEFAULT 'Remote / Hybrid',
    "deadline" TIMESTAMP(3),
    "applyUrl" TEXT,
    "ctc" TEXT,
    "referralNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "rewardPoints" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralPosting_pkey" PRIMARY KEY ("id")
  )`,

  // 10. ReferralApplication
  `CREATE TABLE IF NOT EXISTS "ReferralApplication" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "resumeUrl" TEXT,
    "coverNote" TEXT,
    "alumniNotes" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralApplication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReferralApplication_referralId_studentProfileId_key" UNIQUE ("referralId", "studentProfileId")
  )`,

  // 11. RewardLedger
  `CREATE TABLE IF NOT EXISTS "RewardLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
  )`,

  // 12. NotificationTemplate
  `CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "channels" TEXT NOT NULL DEFAULT 'IN_APP,EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NotificationTemplate_key_key" UNIQUE ("key")
  )`,

  // 13. FileAttachment
  `CREATE TABLE IF NOT EXISTS "FileAttachment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "folder" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER DEFAULT 365,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FileAttachment_fileKey_key" UNIQUE ("fileKey")
  )`,

  // 14. InterviewExperience
  `CREATE TABLE IF NOT EXISTS "InterviewExperience" (
    "id" TEXT NOT NULL,
    "alumniProfileId" TEXT,
    "authorName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "roundsSummary" TEXT NOT NULL,
    "keyQuestions" TEXT NOT NULL,
    "tips" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewExperience_pkey" PRIMARY KEY ("id")
  )`,

  // 15. ResourceItem
  `CREATE TABLE IF NOT EXISTS "ResourceItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT,
    "description" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceItem_pkey" PRIMARY KEY ("id")
  )`,

  // 16. TacieAssessment
  `CREATE TABLE IF NOT EXISTS "TacieAssessment" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetRole" TEXT,
    "score" INTEGER,
    "insights" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TacieAssessment_pkey" PRIMARY KEY ("id")
  )`,

  // 17. Add missing columns to JobApplication
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "driveId" TEXT`,
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'APPLIED'`,
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "fitScore" INTEGER`,
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "matchTier" TEXT`,
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "verifiedProofSummary" TEXT`,
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "stageNotes" TEXT`,
  `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "currentRoundIndex" INTEGER DEFAULT 0`,

  // 18. Add missing columns to JobOffer
  `ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "studentProfileId" TEXT`,
  `ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "companyName" TEXT DEFAULT ''`,
  `ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "roleTitle" TEXT DEFAULT ''`,
  `ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING'`,
  `ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`,

  // 19. Add missing columns to InterviewSchedule
  `ALTER TABLE "InterviewSchedule" ADD COLUMN IF NOT EXISTS "interviewerName" TEXT`,
  `ALTER TABLE "InterviewSchedule" ADD COLUMN IF NOT EXISTS "feedback" TEXT`,
  `ALTER TABLE "InterviewSchedule" ADD COLUMN IF NOT EXISTS "rating" INTEGER`,
  `ALTER TABLE "InterviewSchedule" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'SCHEDULED'`,
  `ALTER TABLE "InterviewSchedule" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`
];

async function run() {
  console.log('Connecting to Neon PostgreSQL...');
  await client.connect();
  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log('Success:', sql.substring(0, 60).replace(/\n/g, ' '));
    } catch (err) {
      console.warn('Notice:', err.message);
    }
  }
  console.log('\n✅ All missing tables & columns successfully provisioned in Neon DB!');
  await client.end();
}

run().catch(console.error);
