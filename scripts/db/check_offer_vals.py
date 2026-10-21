import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    vals = await conn.fetch('SELECT DISTINCT "status" FROM "JobOffer"')
    print(f"JobOffer status values: {[r['status'] for r in vals]}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
