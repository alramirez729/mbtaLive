// The app always calls its own origin. Vite proxies /api to the local proxy in
// development; on Vercel the same path hits the serverless function.

const BASE = '/api';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function get(path, signal) {
  const response = await fetch(`${BASE}${path}`, {
    signal,
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error || `Request failed (${response.status})`);
  }

  const payload = await response.json();
  return payload.data;
}

export const fetchVehicles = (signal) => get('/vehicles', signal);
export const fetchStations = (signal) => get('/stations', signal);
export const fetchAlerts = (signal) => get('/alerts', signal);
export const fetchShapes = (signal) => get('/shapes', signal);

// Fetched only once a bus line is switched on. Bus is ~400 vehicles off peak and
// its geometry is 176 shapes, so neither is loaded for a rail-only visit.
export const fetchBuses = (signal) => get('/buses', signal);
export const fetchBusShapes = (signal) => get('/bus-shapes', signal);
