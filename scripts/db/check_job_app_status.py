import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    r = await conn.fetch("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='JobApplication' AND column_name='status'")
    for row in r:
        print(row)
    vals = await conn.fetch('SELECT DISTINCT "status" FROM "JobApplication"')
    print(f"JobApplication status values: {[x['status'] for x in vals]}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
