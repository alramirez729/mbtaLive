const express = require('express');
const { cached } = require('../lib/cache');
const mbta = require('../lib/mbta');
// Committed snapshot; see scripts/refresh-stations.js for why it is not fetched.
const stations = require('../data/stations.json');

const router = express.Router();

// Vehicles move constantly, alerts change over minutes.
const TTL = { vehicles: 5000, alerts: 60000 };

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

router.get('/vehicles', handler('vehicles', TTL.vehicles, 5, mbta.getVehicles));
router.get('/alerts', handler('alerts', TTL.alerts, 60, mbta.getAlerts));

// Served straight from the snapshot: no upstream call, no cache to warm.
router.get('/stations', (req, res) => {
  edgeCache(res, 86400);
  res.json({ data: stations });
});

module.exports = router;
