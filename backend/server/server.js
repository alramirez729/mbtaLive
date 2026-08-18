// Standalone listener for local development and the existing Render service.
// Vercel does not use this file; it imports app.js directly.

const app = require('./app');

const PORT = process.env.PORT || 8081;

const server = app.listen(PORT, () => {
  console.log(`MBTA proxy listening on http://localhost:${PORT}`);
  console.log(`  health: http://localhost:${PORT}/api/health`);
  if (!process.env.MBTA_API_KEY) {
    console.warn('  MBTA_API_KEY is unset: upstream is limited to 20 requests/minute.');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    // The default here is an unhandled 'error' event and a stack trace that
    // buries the one thing you need to know. A stale proxy is the usual cause:
    // `node --watch` spawns a child that holds the port, so killing the watcher
    // alone leaves the listener behind.
    console.error(`\nPort ${PORT} is already in use, so the proxy did not start.`);
    console.error('Something is still listening, most likely a proxy from an earlier run.\n');
    console.error('Find and stop it:');
    console.error('  Windows  npx kill-port ' + PORT);
    console.error('  macOS/Linux  lsof -ti:' + PORT + ' | xargs kill\n');
    console.error(`Or run on a different port:  PORT=8082 npm run dev:proxy`);
    console.error('(then set PROXY_TARGET=http://localhost:8082 for the frontend)\n');
    process.exit(1);
  }
  throw error;
});

// Ctrl+C should release the port immediately rather than leaving a listener
// behind for the next run to trip over.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Don't let a hung keep-alive connection hold the port open.
    server.closeAllConnections?.();
  });
}
