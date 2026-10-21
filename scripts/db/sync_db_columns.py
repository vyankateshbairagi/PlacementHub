import asyncio
import asyncpg

STATEMENTS = [
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT \'GROWTH\';',
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT \'ACTIVE\';',
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "naacGrade" text;',
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "nirfRank" integer;',
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "dreamOfferThreshold" double precision DEFAULT 10.0;',
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "superDreamThreshold" double precision DEFAULT 20.0;',
    'ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "maxRegularOffers" integer DEFAULT 1;',
    'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "read" boolean DEFAULT false;',
    'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" text DEFAULT \'\';',
    'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "institutionId" text;',
    'ALTER TABLE "AlumniProfile" ADD COLUMN IF NOT EXISTS "isMentorAvailable" boolean DEFAULT true;',
]

async def sync_schema():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    for stmt in STATEMENTS:
        try:
            await conn.execute(stmt)
            print(f"SUCCESS: {stmt[:60]}...")
        except Exception as e:
            print(f"ERROR: {stmt[:60]} -> {e}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(sync_schema())
