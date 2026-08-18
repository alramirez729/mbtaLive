// Regenerates the committed snapshots in ../data.
//
// Station geometry and track geometry change on the order of years (a Green Line
// extension, a new Commuter Rail infill stop), but building them costs about
// twenty upstream requests, because filter[route] returns wrong results past
// four route ids and Commuter Rail has thirteen routes. Paying that on every
// cold start is what these snapshots avoid.
//
// Run with: npm run refresh:static

const fs = require('node:fs/promises');
const path = require('node:path');
const { fetchStationsFromApi, fetchShapesFromApi } = require('../lib/mbta');

const DATA_DIR = path.join(__dirname, '..', 'data');

// A truncated result would silently blank most of the map, so each snapshot
// declares the smallest count that is plausibly correct.
const SNAPSHOTS = [
  {
    file: 'stations.json',
    minimum: 100,
    fetch: fetchStationsFromApi,
    normalize: (stations) => {
      for (const station of stations) station.lineKeys.sort();
      // Sorted so a regenerated snapshot produces a readable diff.
      return stations.sort((a, b) => a.id.localeCompare(b.id));
    },
  },
  {
    file: 'shapes.json',
    minimum: 15,
    fetch: fetchShapesFromApi,
    normalize: (shapes) => shapes.sort((a, b) => a.id.localeCompare(b.id)),
  },
];

async function write({ file, minimum, fetch: fetchData, normalize }) {
  const data = normalize(await fetchData());
  if (data.length < minimum) {
    throw new Error(`${file}: refusing to write ${data.length} records, expected at least ${minimum}`);
  }

  const target = path.join(DATA_DIR, file);
  await fs.writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${data.length} records to data/${file}`);
}

async function main() {
  // Sequential, not parallel: together these are around twenty upstream
  // requests, and the anonymous rate limit is twenty per minute.
  for (const snapshot of SNAPSHOTS) {
    await write(snapshot);
  }
}

main().catch((error) => {
  console.error(`Snapshot refresh failed: ${error.message}`);
  if (error.status === 429) {
    console.error('That is the MBTA rate limit. Set MBTA_API_KEY, or wait a minute and retry.');
  }
  process.exitCode = 1;
});
