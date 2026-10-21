import asyncio
import asyncpg

async def check_nulls():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    # Check if any JobApplication has null studentProfileId
    null_apps = await conn.fetch('SELECT id, "driveId", "openingId" FROM "JobApplication" WHERE "studentProfileId" IS NULL')
    print(f"JobApplication with NULL studentProfileId: {len(null_apps)}")
    if null_apps:
        # Find default studentProfile id
        sp = await conn.fetchrow('SELECT id FROM "StudentProfile" LIMIT 1')
        if sp:
            sp_id = sp['id']
            print(f"Setting NULL studentProfileId to valid profile: {sp_id}")
            await conn.execute('UPDATE "JobApplication" SET "studentProfileId"=$1 WHERE "studentProfileId" IS NULL', sp_id)
            print("Fixed NULL studentProfileId in JobApplication!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_nulls())
