// Regenerates data/stations.json. Station geometry changes on the order of
// years (a Green Line extension, a new Commuter Rail infill stop), so it is
// committed as a snapshot rather than fetched at runtime. Building it takes ten
// upstream requests, which is half the anonymous rate limit, and paying that on
// every cold start is what this snapshot avoids.
//
// Run with: npm run refresh:stations

const fs = require('node:fs/promises');
const path = require('node:path');
const { fetchStationsFromApi } = require('../lib/mbta');

const OUTPUT = path.join(__dirname, '..', 'data', 'stations.json');

async function main() {
  const stations = await fetchStationsFromApi();
  if (stations.length < 100) {
    // A truncated result would silently blank most of the map, so refuse it.
    throw new Error(`Refusing to write a suspiciously small snapshot (${stations.length} stations)`);
  }

  // Sorted so a regenerated snapshot produces a readable diff.
  stations.sort((a, b) => a.id.localeCompare(b.id));
  for (const station of stations) station.lineKeys.sort();

  await fs.writeFile(OUTPUT, `${JSON.stringify(stations, null, 2)}\n`);
  console.log(`Wrote ${stations.length} stations to ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(`Station refresh failed: ${error.message}`);
  process.exitCode = 1;
});
