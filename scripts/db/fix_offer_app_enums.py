import asyncio
import asyncpg

SQL = """
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferStatus') THEN
        CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
        CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SCREENED', 'ASSESSMENT', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'OFFERED', 'REJECTED');
    END IF;
END $$;

ALTER TABLE "JobOffer" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JobOffer" 
  ALTER COLUMN "status" TYPE "OfferStatus" USING ("status"::"OfferStatus");
ALTER TABLE "JobOffer" 
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OfferStatus";

ALTER TABLE "JobApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JobApplication" 
  ALTER COLUMN "status" TYPE "ApplicationStatus" USING ("status"::"ApplicationStatus");
ALTER TABLE "JobApplication" 
  ALTER COLUMN "status" SET DEFAULT 'APPLIED'::"ApplicationStatus";
"""

async def run():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    print("Converting JobOffer and JobApplication status columns to enums...")
    await conn.execute(SQL)
    print("Successfully converted JobOffer and JobApplication status columns!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(run())
