const express = require('express');
const { cached } = require('../lib/cache');
const mbta = require('../lib/mbta');
const { RAIL_ROUTE_TYPES, BUS_ROUTE_TYPE } = require('../lib/lines');
// Committed snapshots; see scripts/refresh-static.js for why these are not fetched.
const stations = require('../data/stations.json');
const shapes = require('../data/shapes.json');
const busShapes = require('../data/bus-shapes.json');
const busRoutes = require('../data/bus-routes.json');

const router = express.Router();

// Vehicles move constantly, alerts change over minutes. The vehicle TTL sits
// below the client's 5s poll so a poll is not repeatedly served a cache entry
// that is about to expire, which would make the arrival of new data uneven.
const TTL = { vehicles: 2500, alerts: 60000, busStops: 12 * 60 * 60 * 1000 };

// Guards the per-route cache key, so a junk query cannot grow the cache without
// bound or reach the upstream with something unexpected.
const ROUTE_ID = /^[A-Za-z0-9_-]{1,32}$/;
const BUS_ROUTE_IDS = new Set(busRoutes.map((route) => route.id));

// Let Vercel's CDN serve most repeat hits, and keep serving the last good copy
// while a refresh is in flight.
function edgeCache(res, seconds) {
  res.set('Cache-Control', `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`);
}

function handler(key, ttlMs, seconds, producer) {
  return async (req, res, next) => {
    try {
      const data = await cached(key, ttlMs, producer);
      edgeCache(res, seconds);
      res.json({ data, fetchedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  };
}

router.get('/vehicles', handler('vehicles', TTL.vehicles, 3, () => mbta.getVehicles(RAIL_ROUTE_TYPES)));

// Separate from /vehicles because bus is several times the fleet size and is off
// by default, so a rail-only visitor never pays for it.
router.get('/buses', handler('buses', TTL.vehicles, 3, () => mbta.getVehicles(BUS_ROUTE_TYPE)));
router.get('/alerts', handler('alerts', TTL.alerts, 60, mbta.getAlerts));

// Served straight from the snapshots: no upstream call, no cache to warm.
router.get('/stations', (req, res) => {
  edgeCache(res, 86400);
  res.json({ data: stations });
});

// Track geometry, as encoded polylines the browser decodes.
router.get('/shapes', (req, res) => {
  edgeCache(res, 86400);
  res.json({ data: shapes });
});

// 149 bus routes, so this is much larger than the rail geometry and is only
// requested once the rider turns a bus line on.
router.get('/bus-shapes', (req, res) => {
  edgeCache(res, 86400);
  res.json({ data: busShapes });
});

// The bus route directory: every route with the towns it serves and the rail
// lines it meets. Small, and static enough to ship as a snapshot.
router.get('/bus-routes', (req, res) => {
  edgeCache(res, 86400);
  res.json({ data: busRoutes });
});

// Stops for one route, on demand. All 149 routes together is 10,500 stops and
// 1.2MB, and the page only ever shows the route the rider picked.
router.get('/bus-stops', async (req, res, next) => {
  const routeId = String(req.query.route ?? '');
  if (!ROUTE_ID.test(routeId) || !BUS_ROUTE_IDS.has(routeId)) {
    return res.status(400).json({ error: 'Unknown bus route', route: routeId });
  }

  try {
    const data = await cached(`bus-stops:${routeId}`, TTL.busStops, () =>
      mbta.getBusRouteStops(routeId),
    );
    edgeCache(res, 86400);
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
