const express = require('express');
const { cached } = require('../lib/cache');
const mbta = require('../lib/mbta');
// Committed snapshots; see scripts/refresh-static.js for why these are not fetched.
const stations = require('../data/stations.json');
const shapes = require('../data/shapes.json');

const router = express.Router();

// Vehicles move constantly, alerts change over minutes. The vehicle TTL sits
// below the client's 5s poll so a poll is not repeatedly served a cache entry
// that is about to expire, which would make the arrival of new data uneven.
const TTL = { vehicles: 2500, alerts: 60000 };

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

router.get('/vehicles', handler('vehicles', TTL.vehicles, 3, mbta.getVehicles));
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

module.exports = router;
