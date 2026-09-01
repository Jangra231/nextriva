import { createPool } from 'mysql2/promise';
import 'dotenv/config';

const pool = createPool({ uri: process.env.DATABASE_URL, connectionLimit: 2 });

async function main() {
  const [ev] = await pool.execute(
    "SELECT id, slug, title, displayName, status, moderationStatus, visibility, city, venueName FROM events WHERE slug LIKE 'demo-%' ORDER BY startsAt"
  );
  console.log('Demo events in DB:', ev.length);
  for (const e of ev) {
    const visible = e.status === 'live' && e.visibility === 'public' && (e.moderationStatus === 'approved' || e.moderationStatus === 'draft');
    console.log(`  [${e.status}/${e.moderationStatus}/${e.visibility}] ${e.displayName} — ${e.city} ${visible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  }

  const [v] = await pool.execute("SELECT COUNT(*) as c FROM approvedVenues WHERE venueName LIKE 'Sample · %' AND active=1");
  console.log('\nActive sample venues:', v[0].c);

  const [t] = await pool.execute('SELECT COUNT(*) as c FROM tickets');
  console.log('Total tickets:', t[0].c);

  const [cats] = await pool.execute('SELECT name, slug FROM categories ORDER BY name');
  console.log('Categories:', cats.map(c => c.name).join(', '));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });