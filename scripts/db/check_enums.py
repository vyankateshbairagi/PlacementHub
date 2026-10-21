import asyncio
import asyncpg

async def check_placement_drive():
    conn = await asyncpg.connect('postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?ssl=require')
    rows = await conn.fetch("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='PlacementDrive' ORDER BY column_name;")
    print("--- PlacementDrive Columns ---")
    for r in rows:
        print(f"  {r['column_name']} (data_type={r['data_type']}, udt={r['udt_name']})")
    
    enums = await conn.fetch("SELECT typname FROM pg_type WHERE typcategory='E';")
    print("\n--- Existing Enums ---")
    for e in enums:
        print(f"  {e['typname']}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_placement_drive())
