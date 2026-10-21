import asyncio
import asyncpg

async def check_audit_log():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    rows = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='AuditLog' ORDER BY column_name;")
    print("--- AuditLog Columns ---")
    for r in rows:
        print(f"  {r['column_name']} ({r['data_type']})")
    
    rows2 = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='JobOffer' ORDER BY column_name;")
    print("--- JobOffer Columns ---")
    for r in rows2:
        print(f"  {r['column_name']} ({r['data_type']})")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_audit_log())
