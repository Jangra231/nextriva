async function deepTest() {
  // 1. Paris Open Data - upcoming events
  try {
    const res = await fetch('https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?limit=2&where=date_start%3E%222026-09-01%22&order_by=date_start');
    const data = await res.json();
    console.log('=== PARIS EVENTS (upcoming) ===');
    console.log(JSON.stringify(data.results?.[0], null, 2));
    console.log('Total count:', data.total_count);
  } catch(e) { console.log('Paris err:', e.message); }

  // 2. NYC Open Data - latest events
  try {
    const res = await fetch("https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$limit=2&$order=start_date_time%20DESC");
    const data = await res.json();
    console.log('\n=== NYC EVENTS ===');
    console.log(JSON.stringify(data[0], null, 2));
  } catch(e) { console.log('NYC err:', e.message); }

  // 3. Wikidata SPARQL deeper
  try {
    const sparql = [
      'SELECT ?event ?eventLabel ?locationLabel ?countryLabel ?startDate ?endDate ?image ?coord WHERE {',
      '  ?event wdt:P31/wdt:P279* wd:Q132241 .',
      '  ?event wdt:P276 ?location .',
      '  ?event wdt:P17 ?country .',
      '  ?event wdt:P580 ?startDate .',
      '  OPTIONAL { ?event wdt:P582 ?endDate . }',
      '  OPTIONAL { ?event wdt:P18 ?image . }',
      '  OPTIONAL { ?location wdt:P625 ?coord . }',
      '  FILTER(?startDate >= "2026-01-01"^^xsd:dateTime)',
      '  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }',
      '} ORDER BY ?startDate LIMIT 10'
    ].join('\n');
    const res = await fetch('https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparql) + '&format=json', {
      headers: { 'User-Agent': 'NexrivaEvents/1.0', 'Accept': 'application/sparql-results+json' }
    });
    const data = await res.json();
    console.log('\n=== WIKIDATA WORLDWIDE FESTIVALS ===');
    data.results?.bindings?.forEach((b, i) => {
      console.log((i+1) + '. ' + (b.eventLabel?.value||'?') + ' | ' + (b.locationLabel?.value||'?') + ', ' + (b.countryLabel?.value||'?') + ' | ' + (b.startDate?.value||'?') + ' | img: ' + (b.image?.value || 'none'));
    });
  } catch(e) { console.log('Wikidata err:', e.message); }

  // 4. Berlin Open Data
  try {
    const res = await fetch('https://daten.berlin.de/api/3/action/package_search?q=events&rows=2');
    console.log('\nBerlin:', res.status);
  } catch(e) { console.log('Berlin err:', e.message); }

  // 5. London Open Data
  try {
    const res = await fetch('https://data.london.gov.uk/api/3/action/package_search?q=events&rows=2');
    console.log('London:', res.status);
  } catch(e) { console.log('London err:', e.message); }
}
deepTest();
