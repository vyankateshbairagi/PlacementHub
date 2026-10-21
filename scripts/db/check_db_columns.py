import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    tables = ['Institution', 'Notification', 'StudentProject', 'AlumniProfile', 'JobApplication']
    for table in tables:
        rows = await conn.fetch(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY column_name;",
            table
        )
        print(f"\n--- {table} ---")
        for r in rows:
            print(f"  {r['column_name']} ({r['data_type']}, nullable={r['is_nullable']})")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
