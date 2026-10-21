import asyncio
import asyncpg

SQL = """
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobType') THEN
        CREATE TYPE "JobType" AS ENUM ('ON_CAMPUS', 'OFF_CAMPUS', 'POOLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DriveStatus') THEN
        CREATE TYPE "DriveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
        CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SCREENED', 'ASSESSMENT', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'OFFERED', 'REJECTED');
    END IF;
END $$;

ALTER TABLE "PlacementDrive" ALTER COLUMN "jobType" DROP DEFAULT;
ALTER TABLE "PlacementDrive" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "PlacementDrive" 
  ALTER COLUMN "jobType" TYPE "JobType" USING ("jobType"::"JobType"),
  ALTER COLUMN "status" TYPE "DriveStatus" USING ("status"::"DriveStatus");

ALTER TABLE "PlacementDrive" 
  ALTER COLUMN "jobType" SET DEFAULT 'ON_CAMPUS'::"JobType",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"DriveStatus";

ALTER TABLE "Notification" 
  ADD COLUMN IF NOT EXISTS "metadata" text DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "actionUrl" text;
"""

async def run():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    print("Executing enum creation and column alteration...")
    await conn.execute(SQL)
    print("Schema synchronized successfully!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
