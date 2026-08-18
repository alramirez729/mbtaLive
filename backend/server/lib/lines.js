// Single source of truth for how MBTA route ids collapse into the lines the map
// filters by. Only the mapping lives here; how a line looks is the frontend's
// concern, so no colors or labels are duplicated across the two sides.

const LINE_KEYS = ['Red', 'Orange', 'Blue', 'Green', 'Mattapan', 'CR', 'SL', 'Bus'];

const KNOWN = new Set(LINE_KEYS);

// Rail: light rail (0) covers Green and Mattapan, heavy rail (1) covers
// Red/Orange/Blue, and (2) is Commuter Rail.
const RAIL_ROUTE_TYPES = '0,1,2';
const BUS_ROUTE_TYPE = '3';

// The Silver Line is bus rapid transit, so it arrives as route_type 3 alongside
// 143 ordinary bus routes. MBTA distinguishes it only by giving these six routes
// the colour #7C878E while every other bus is #FFC72C. The ids are listed rather
// than sniffed from the colour because lineKeyForRoute is given an id alone, and
// this set has been stable for years.
const SILVER_LINE_ROUTES = new Set(['741', '742', '743', '746', '749', '751']);

/**
 * Branches (Green-B .. Green-E) and named commuter routes (CR-Fitchburg) all
 * belong to one line as far as the map is concerned. `routeType` is needed only
 * to tell a bus from anything else, since bus ids are bare numbers like "1".
 */
function lineKeyForRoute(routeId, routeType) {
  if (!routeId) return null;

  if (String(routeType) === BUS_ROUTE_TYPE) {
    return SILVER_LINE_ROUTES.has(routeId) ? 'SL' : 'Bus';
  }

  if (routeId.startsWith('Green')) return 'Green';
  if (routeId.startsWith('CR-')) return 'CR';
  if (KNOWN.has(routeId)) return routeId;

  // No route type given and not a recognised rail id: it is a bus route number,
  // which cannot be classified without knowing the type.
  return SILVER_LINE_ROUTES.has(routeId) ? 'SL' : null;
}

module.exports = {
  LINE_KEYS,
  lineKeyForRoute,
  RAIL_ROUTE_TYPES,
  BUS_ROUTE_TYPE,
  SILVER_LINE_ROUTES,
};
