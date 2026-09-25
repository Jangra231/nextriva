async function testProviders() {
  console.log('Testing providers...\n');
  
  // Test Paris Open Data
  try {
    const res = await fetch('https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?limit=5&order_by=-date_start', {
      headers: { Accept: 'application/json' }
    });
    const data = await res.json();
    console.log('Paris Open Data:', res.status, 'total:', data.total_count, 'results:', data.results?.length);
    if (data.results?.length > 0) {
      console.log('  First event:', data.results[0].titre, '| date:', data.results[0].date_start);
    }
  } catch(e) {
    console.log('Paris error:', e.message);
  }

  // Test NYC Open Data
  try {
    const res = await fetch('https://data.cityofnewyork.us/resource/fudw-fgrp.json?%24limit=5', {
      headers: { Accept: 'application/json' }
    });
    const data = await res.json();
    console.log('\nNYC Open Data:', res.status, typeof data, Array.isArray(data) ? data.length : JSON.stringify(data).substring(0, 100));
    if (Array.isArray(data) && data.length > 0) {
      console.log('  First event:', data[0].event_name, '| date:', data[0].start_date_time);
    }
  } catch(e) {
    console.log('NYC error:', e.message);
  }

  // Test Wikidata
  try {
    const sparql = encodeURIComponent('SELECT ?event ?eventLabel ?startDate WHERE { ?event wdt:P31/wdt:P279* wd:Q132241; wdt:P580 ?startDate . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 5');
    const res = await fetch(`https://query.wikidata.org/sparql?query=${sparql}&format=json`, {
      headers: { Accept: 'application/sparql-results+json' }
    });
    const data = await res.json();
    console.log('\nWikidata SPARQL:', res.status, 'bindings:', data.results?.bindings?.length || 0);
  } catch(e) {
    console.log('Wikidata error:', e.message);
  }
}

testProviders();