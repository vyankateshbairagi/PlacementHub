import asyncio
import asyncpg

async def check_values():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    jt_vals = await conn.fetch('SELECT DISTINCT "jobType" FROM "PlacementDrive"')
    print(f"Distinct jobType values: {[r['jobType'] for r in jt_vals]}")
    st_vals = await conn.fetch('SELECT DISTINCT "status" FROM "PlacementDrive"')
    print(f"Distinct status values: {[r['status'] for r in st_vals]}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_values())
