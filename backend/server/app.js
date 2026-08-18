// The Express app is deliberately separate from the listener: `server.js` calls
// listen() for local dev and Render, while `api/[[...path]].js` hands this same
// app to Vercel as a serverless function. One proxy implementation, two hosts.

const express = require('express');
const cors = require('cors');
const mbtaRouter = require('./routes/mbta');
const { UpstreamError } = require('./lib/mbta');

const app = express();

app.disable('x-powered-by');
// The browser calls this proxy same-origin on Vercel. CORS only matters for the
// split local setup (Vite on 5173, proxy on 8081) and the Render deployment.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    // Surfaced so a deploy can be checked for the rate-limit-raising key
    // without exposing the key itself.
    mbtaKeyConfigured: Boolean(process.env.MBTA_API_KEY),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.use('/api', mbtaRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((error, req, res, next) => {
  if (error instanceof UpstreamError) {
    console.error(`MBTA upstream ${error.status} for ${req.path}`);
    // 502 rather than passing the upstream status through, so a client can tell
    // "the proxy is fine, MBTA is not" from "the proxy is broken".
    return res.status(502).json({ error: 'MBTA API unavailable', upstreamStatus: error.status });
  }
  console.error(`Unhandled error for ${req.path}:`, error);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
