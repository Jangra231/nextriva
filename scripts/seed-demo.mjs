import { createPool } from 'mysql2/promise';
import { randomBytes, scryptSync } from 'crypto';
import 'dotenv/config';

const pool = createPool({ uri: process.env.DATABASE_URL, waitForConnections: true, connectionLimit: 5 });

function id() { return randomBytes(10).toString('base64url').toUpperCase().slice(0, 16); }
function hashPw(pw) { const s = randomBytes(16).toString('hex'); return `${s}:${scryptSync(pw, s, 64).toString('hex')}`; }
function genEvtId() { return `EVT-${id()}`; }
function genUsrId() { return `USR-${id()}`; }

async function main() {
  console.log('Connecting to database...');
  await pool.execute('SELECT 1');
  console.log('Connected.\n');

  // 1. Ensure admin user
  console.log('=== Step 1: Admin user ===');
  const [adminRows] = await pool.execute('SELECT id, publicId FROM users WHERE email = ?', ['admin@fitizen.local']);
  let adminId, adminPubId;
  if (adminRows.length === 0) {
    adminPubId = genUsrId();
    const [r] = await pool.execute('INSERT INTO users (publicId,openId,name,email,role,loginMethod,passwordHash,lastSignedIn) VALUES (?,?,?,?,?,?,?,NOW())', [adminPubId, 'admin-fitizen-local', 'Admin', 'admin@fitizen.local', 'admin', 'password', hashPw('Admin@123')]);
    adminId = r.insertId;
    console.log('  Created admin (id=' + adminId + ')');
  } else {
    adminId = adminRows[0].id; adminPubId = adminRows[0].publicId;
    await pool.execute('UPDATE users SET passwordHash=? WHERE id=?', [hashPw('Admin@123'), adminId]);
    console.log('  Found admin (id=' + adminId + '). Password reset.');
  }

  // 2. Ensure categories
  console.log('\n=== Step 2: Categories ===');
  const cats = [['Running','running'],['Wellness','wellness'],['Music','music'],['Learning','learning'],['Food & Drink','food-drink'],['Community','community'],['Yoga','yoga'],['Workshop','workshop'],['Heritage','heritage']];
  for (const [n, s] of cats) await pool.execute('INSERT IGNORE INTO categories (name,slug) VALUES (?,?)', [n, s]);
  console.log('  Categories ensured');

  // 3. Seed sample venues
  console.log('\n=== Step 3: Sample Venues ===');
  const venues = [
    { zone:'North Delhi', ward:'Ward 01', location:'Hauz Khas Village', venueName:'Sample · Hauz Khas Park', city:'Delhi', address:'Near Hauz Khas Village, South Delhi', sector:'Hauz Khas', area:'South Delhi', latitudeE6:28549400, longitudeE6:77200100, setting:'outdoor', capacity:1200, isAccessible:1, accessibilityNotes:'Step-free entry and accessible washroom' },
    { zone:'Greater Noida', ward:'Ward 08', location:'Buddh International Circuit', venueName:'Sample · Buddh Circuit Arena', city:'Delhi NCR', address:'Greater Noida Expressway, Sector 25', sector:'Greater Noida', area:'Greater Noida', latitudeE6:28348700, longitudeE6:77533100, setting:'outdoor', capacity:450, isAccessible:1, accessibilityNotes:'Lift access and reserved seating' },
    { zone:'Central Delhi', ward:'Ward 14', location:'Pragati Maidan', venueName:'Sample · Pragati Exhibition Centre', city:'Delhi', address:'Pragati Maidan, Mathura Road', sector:'Central Delhi', area:'Central Delhi', latitudeE6:28616800, longitudeE6:77243300, setting:'indoor', capacity:2000, isAccessible:1, accessibilityNotes:'Wheelchair ramps and accessible lifts' },
    { zone:'South Mumbai', ward:'Ward 31', location:'Marine Drive', venueName:'Sample · Marine Drive Promenade', city:'Mumbai', address:'Marine Drive, South Mumbai', sector:'Marine Drive', area:'South Mumbai', latitudeE6:18943100, longitudeE6:72823300, setting:'outdoor', capacity:1500, isAccessible:0, accessibilityNotes:null },
    { zone:'Central Bengaluru', ward:'Ward 40', location:'Cubbon Park', venueName:'Sample · Cubbon Park Grounds', city:'Bengaluru', address:'Cubbon Park, near Vidhana Soudha', sector:'Central Bengaluru', area:'Central Bengaluru', latitudeE6:12976500, longitudeE6:77585300, setting:'outdoor', capacity:600, isAccessible:1, accessibilityNotes:'Flat ground with accessible parking' },
    { zone:'South Delhi', ward:'Ward 45', location:'Qutub Minar Complex', venueName:'Sample · Qutub Minar Lawns', city:'Delhi', address:'Qutub Minar, Mehrauli', sector:'Mehrauli', area:'South Delhi', latitudeE6:28524400, longitudeE6:77185500, setting:'outdoor', capacity:1000, isAccessible:0, accessibilityNotes:null },
    { zone:'Central Bengaluru', ward:'Ward 50', location:'Ulsoor Lake', venueName:'Sample · Ulsoor Lake Pavilion', city:'Bengaluru', address:'Ulsoor Lake, HAL 2nd Stage', sector:'Ulsoor', area:'Central Bengaluru', latitudeE6:12977100, longitudeE6:77627100, setting:'indoor', capacity:350, isAccessible:1, accessibilityNotes:'Lift access and accessible restrooms' },
    { zone:'Central Mumbai', ward:'Ward 22', location:'Phoenix Marketcity', venueName:'Sample · Phoenix Marketcity Atrium', city:'Mumbai', address:'LBS Road, Kurla West', sector:'Kurla', area:'Central Mumbai', latitudeE6:19085800, longitudeE6:72885200, setting:'indoor', capacity:800, isAccessible:1, accessibilityNotes:'Fully accessible indoor venue with elevator' },
  ];
  let vc = 0, vu = 0;
  for (const v of venues) {
    const [ex] = await pool.execute('SELECT id FROM approvedVenues WHERE venueName=?', [v.venueName]);
    if (ex.length > 0) {
      await pool.execute('UPDATE approvedVenues SET zone=?,ward=?,location=?,city=?,address=?,sector=?,area=?,latitudeE6=?,longitudeE6=?,setting=?,capacity=?,isAccessible=?,accessibilityNotes=?,active=1,updatedAt=NOW() WHERE venueName=?', [v.zone,v.ward,v.location,v.city,v.address,v.sector,v.area,v.latitudeE6,v.longitudeE6,v.setting,v.capacity,v.isAccessible,v.accessibilityNotes,v.venueName]);
      vu++;
    } else {
      await pool.execute('INSERT INTO approvedVenues (zone,ward,location,venueName,city,address,sector,area,latitudeE6,longitudeE6,setting,capacity,isAccessible,accessibilityNotes,active,createdByAdminId,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,NOW(),NOW())', [v.zone,v.ward,v.location,v.venueName,v.city,v.address,v.sector,v.area,v.latitudeE6,v.longitudeE6,v.setting,v.capacity,v.isAccessible,v.accessibilityNotes,adminId]);
      vc++;
    }
  }
  console.log('  ' + vc + ' created, ' + vu + ' updated');

  // 4. Seed demo events
  console.log('\n=== Step 4: Demo Events ===');
  const [vr] = await pool.execute('SELECT * FROM approvedVenues WHERE venueName LIKE ? AND active=1 ORDER BY id', ['Sample · %']);
  const vm = {};
  for (const v of vr) vm[v.venueName] = v;

  const now = new Date();
  const sod = (off) => { const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return d; };
  const at = (day, h) => { const d = new Date(day); d.setHours(h,0,0,0); return d; };

  const seeds = [
    { slug:'demo-yoga-hauz-khas', title:'Morning Yoga at Hauz Khas Park', displayName:'Morning Yoga', vn:'Sample · Hauz Khas Park', startsAt:at(sod(2),6), cat:'yoga' },
    { slug:'demo-food-fest-buddh', title:'Street Food Festival at Buddh Circuit', displayName:'Street Food Festival', vn:'Sample · Buddh Circuit Arena', startsAt:at(sod(5),11), cat:'food-drink' },
    { slug:'demo-concert-pragati', title:'Evening Music Concert at Pragati Maidan', displayName:'Evening Music Concert', vn:'Sample · Pragati Exhibition Centre', startsAt:at(sod(8),18), cat:'music' },
    { slug:'demo-marathon-marine', title:'Marine Drive 10K Marathon', displayName:'Marine Drive Marathon', vn:'Sample · Marine Drive Promenade', startsAt:at(sod(3),5), cat:'running' },
    { slug:'demo-workshop-cubbon', title:'Tech Workshop at Cubbon Park', displayName:'Tech Workshop', vn:'Sample · Cubbon Park Grounds', startsAt:at(sod(10),10), cat:'workshop' },
    { slug:'demo-heritage-qutub', title:'Heritage Walk around Qutub Minar', displayName:'Heritage Walk', vn:'Sample · Qutub Minar Lawns', startsAt:at(sod(4),7), cat:'heritage' },
    { slug:'demo-wellness-ulsoor', title:'Wellness Retreat at Ulsoor Lake', displayName:'Wellness Retreat', vn:'Sample · Ulsoor Lake Pavilion', startsAt:at(sod(7),9), cat:'wellness' },
    { slug:'demo-community-phoenix', title:'Community Meetup at Phoenix Marketcity', displayName:'Community Meetup', vn:'Sample · Phoenix Marketcity Atrium', startsAt:at(sod(6),16), cat:'community' },
  ];

  let ec = 0, es = 0;
  for (const s of seeds) {
    const [ex] = await pool.execute('SELECT id FROM events WHERE slug=?', [s.slug]);
    if (ex.length > 0) { es++; continue; }
    const v = vm[s.vn];
    if (!v) { console.log('  SKIP (no venue): ' + s.slug); continue; }
    const endsAt = new Date(s.startsAt); endsAt.setHours(s.startsAt.getHours()+4);
    const addr = [v.location,v.sector,v.area,v.city].filter(Boolean).join(', ');
    const pid = genEvtId();
    const [cr] = await pool.execute('SELECT id FROM categories WHERE slug=?', [s.cat]);
    const cid = cr.length > 0 ? cr[0].id : null;
    await pool.query('INSERT INTO events (organizerId,organizerPublicId,publicId,categoryId,title,displayName,slug,visibility,status,moderationStatus,currentStep,startsAt,endsAt,timezone,locationMode,locationSource,approvedVenueId,city,venueName,addressLine1,addressLine2,address,zone,ward,sector,area,latitudeE6,longitudeE6,venueSetting,venueCapacity,venueIsAccessible,venueAccessibilityNotes,platformFeePercent,publishedAt,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [adminId,adminPubId,pid,cid,s.title,s.displayName,s.slug,'public','live','approved',5,s.startsAt,endsAt,'Asia/Calcutta','address','directory',v.id,v.city,v.venueName,v.location,v.address||null,addr,v.zone,v.ward,v.sector,v.area,v.latitudeE6,v.longitudeE6,v.setting,v.capacity,v.isAccessible,v.accessibilityNotes,0,new Date(),new Date()]);
    ec++;
    console.log('  ✓ ' + s.displayName + ' (' + s.slug + ')');
  }
  console.log('  ' + ec + ' created, ' + es + ' skipped');

  // 5. Add free tickets
  console.log('\n=== Step 5: Free Tickets ===');
  const [live] = await pool.execute('SELECT id,title FROM events WHERE status=? AND moderationStatus=? AND visibility=?', ['live','approved','public']);
  let tc = 0;
  for (const ev of live) {
    const [et] = await pool.execute('SELECT id FROM tickets WHERE eventId=?', [ev.id]);
    if (et.length === 0) {
      await pool.execute('INSERT INTO tickets (eventId,name,pricePaise,ticketCategory,quantityLimit,isActive,salesStartAt,createdAt) VALUES (?,?,?,?,?,?,?,NOW())', [ev.id,'General Admission',0,'free',500,true,new Date()]);
      tc++;
      console.log('  ✓ Ticket for: ' + ev.title);
    }
  }
  console.log('  ' + tc + ' tickets created');

  // Summary
  console.log('\n========================================');
  console.log('✅ Seed complete!');
  console.log('   Venues: ' + (vc + vu));
  console.log('   Events: ' + ec + ' new');
  console.log('   Tickets: ' + tc + ' new');
  console.log('\n   Admin: admin@fitizen.local / Admin@123');
  console.log('   Browse: http://localhost:3000/events');
  console.log('========================================');
  await pool.end();
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });
