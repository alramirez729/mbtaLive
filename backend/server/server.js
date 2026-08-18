// Standalone listener for local development and the existing Render service.
// Vercel does not use this file; it imports app.js directly.

const app = require('./app');

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`MBTA proxy listening on http://localhost:${PORT}`);
  console.log(`  health: http://localhost:${PORT}/api/health`);
  if (!process.env.MBTA_API_KEY) {
    console.warn('  MBTA_API_KEY is unset: upstream is limited to 20 requests/minute.');
  }
});
