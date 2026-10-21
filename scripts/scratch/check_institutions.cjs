const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, name, slug FROM "Institution"');
  console.table(res.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});
