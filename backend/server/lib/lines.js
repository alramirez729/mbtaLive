// Single source of truth for how MBTA route ids collapse into the lines the map
// filters by. Only the mapping lives here; how a line looks is the frontend's
// concern, so no colors or labels are duplicated across the two sides.

const LINE_KEYS = ['Red', 'Orange', 'Blue', 'Green', 'Mattapan', 'CR'];

const KNOWN = new Set(LINE_KEYS);

// Branches (Green-B .. Green-E) and named commuter routes (CR-Fitchburg) all
// belong to one line as far as the map is concerned.
function lineKeyForRoute(routeId) {
  if (!routeId) return null;
  if (routeId.startsWith('Green')) return 'Green';
  if (routeId.startsWith('CR-')) return 'CR';
  return KNOWN.has(routeId) ? routeId : null;
}

module.exports = { LINE_KEYS, lineKeyForRoute };
