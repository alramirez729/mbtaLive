// Upstream MBTA v3 client. Everything the browser needs is normalized here so
// the frontend never parses JSON:API relationships, and so a single upstream
// call replaces the three duplicate ones the old map made per refresh.

const { lineKeyForRoute } = require('./lines');

const MBTA_BASE = 'https://api-v3.mbta.com';

// Light rail (0) covers Green Line and Mattapan, heavy rail (1) covers
// Red/Orange/Blue, and (2) is Commuter Rail.
const ROUTE_TYPES = '0,1,2';

// See the note in getStations: beyond four ids the API returns bad data.
const ROUTE_FILTER_CHUNK = 4;

class UpstreamError extends Error {
  constructor(status, body) {
    super(`MBTA API responded ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, params = {}) {
  const url = new URL(path, MBTA_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }

  const headers = { accept: 'application/vnd.api+json' };
  // Anonymous access is rate limited to 20 req/min; a key raises it to 1000.
  if (process.env.MBTA_API_KEY) headers['x-api-key'] = process.env.MBTA_API_KEY;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new UpstreamError(response.status, await response.text().catch(() => ''));
  }
  return response.json();
}

// JSON:API returns related records in a flat `included` array. Index it once by
// "type:id" so relationship lookups are O(1) instead of repeated Array.find.
function indexIncluded(included = []) {
  const index = new Map();
  for (const record of included) index.set(`${record.type}:${record.id}`, record);
  return index;
}

function relatedId(resource, name) {
  return resource.relationships?.[name]?.data?.id ?? null;
}

function humanizeStatus(status) {
  if (!status) return 'in service';
  return status.toLowerCase().replace(/_/g, ' ');
}

async function getVehicles() {
  // Folding stops, routes, and trips into this one response replaces the three
  // separate calls the old map made on every refresh.
  const payload = await request('/vehicles', {
    'filter[route_type]': ROUTE_TYPES,
    include: 'stop,route,trip',
  });
  const included = indexIncluded(payload.included);

  const vehicles = [];
  for (const vehicle of payload.data ?? []) {
    const { latitude, longitude } = vehicle.attributes ?? {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

    const routeId = relatedId(vehicle, 'route');
    const lineKey = lineKeyForRoute(routeId);
    if (!lineKey) continue;

    const route = included.get(`route:${routeId}`);
    const stop = included.get(`stop:${relatedId(vehicle, 'stop')}`);
    const trip = included.get(`trip:${relatedId(vehicle, 'trip')}`);
    const directionId = vehicle.attributes.direction_id;

    vehicles.push({
      id: vehicle.id,
      lineKey,
      routeId,
      // Green-B reads better as "B" on a marker than "Green-B".
      badge: routeId.startsWith('Green') ? routeId.slice(-1) : null,
      routeName: route?.attributes?.long_name || routeId,
      // No colour here on purpose: the frontend palette is the single source of
      // truth. MBTA reports Mattapan as #DA291C, identical to the Red Line,
      // which would make the trolley's markers disagree with its own route line
      // and filter chip.
      label: vehicle.attributes.label ?? null,
      status: humanizeStatus(vehicle.attributes.current_status),
      stopName: stop?.attributes?.name ?? null,
      // The trip headsign is the actual destination ("Heath Street"), where the
      // route-level destination is only the end of the line. Short turns and
      // branch service make the difference visible.
      headsign:
        trip?.attributes?.headsign ||
        route?.attributes?.direction_destinations?.[directionId] ||
        null,
      bearing: vehicle.attributes.bearing ?? null,
      latitude,
      longitude,
      updatedAt: vehicle.attributes.updated_at ?? null,
    });
  }
  return vehicles;
}

// `/routes` uses filter[type] where the other endpoints use filter[route_type].
async function getRoutesByLine() {
  const payload = await request('/routes', { 'filter[type]': ROUTE_TYPES });

  const byLine = new Map();
  for (const route of payload.data ?? []) {
    const lineKey = lineKeyForRoute(route.id);
    if (!lineKey) continue;
    if (!byLine.has(lineKey)) byLine.set(lineKey, []);
    byLine.get(lineKey).push(route.id);
  }
  return byLine;
}

/**
 * Requests `path` once per line, tagging each response with its lineKey.
 *
 * filter[route] accepts a comma-separated list, but silently returns a wrong,
 * truncated result once the list exceeds four ids, so the ids are chunked.
 * That matters only for Commuter Rail, which has thirteen routes.
 */
async function requestPerLine(path, extraParams = {}) {
  const byLine = await getRoutesByLine();

  const requests = [];
  for (const [lineKey, routeIds] of byLine) {
    for (let i = 0; i < routeIds.length; i += ROUTE_FILTER_CHUNK) {
      const chunk = routeIds.slice(i, i + ROUTE_FILTER_CHUNK);
      requests.push(
        request(path, { ...extraParams, 'filter[route]': chunk.join(',') }).then((payload) => [
          lineKey,
          payload,
        ]),
      );
    }
  }
  return Promise.all(requests);
}

async function fetchStationsFromApi() {
  // Filtering stops by route_type returns individual platforms with no route
  // association, while filtering by route returns the parent stations directly.
  const responses = await requestPerLine('/stops');
  const results = responses.map(([lineKey, payload]) => [lineKey, payload.data ?? []]);

  // Downtown transfer stations are returned once per line that serves them, so
  // they collapse into one marker that remembers every line.
  const stations = new Map();
  for (const [lineKey, stops] of results) {
    for (const stop of stops) {
      const attributes = stop.attributes ?? {};
      if (typeof attributes.latitude !== 'number' || typeof attributes.longitude !== 'number') continue;

      const existing = stations.get(stop.id);
      if (existing) {
        if (!existing.lineKeys.includes(lineKey)) existing.lineKeys.push(lineKey);
        continue;
      }

      stations.set(stop.id, {
        id: stop.id,
        name: attributes.name || 'Unnamed stop',
        // Descriptions repeat the station name, which is redundant once the
        // name is already the popup heading.
        description:
          (attributes.description || '').replace(`${attributes.name} - `, '') || null,
        municipality: attributes.municipality ?? null,
        latitude: attributes.latitude,
        longitude: attributes.longitude,
        lineKeys: [lineKey],
      });
    }
  }
  return [...stations.values()];
}

/**
 * Track geometry for each line, as encoded polylines.
 *
 * A route has many raw shapes (twelve for Red), most of them near-duplicate
 * variants. Canonical route patterns are the small representative set instead:
 * two for Red, one per Green branch. Only direction 0 is kept, because
 * direction 1 is the same track described backwards.
 *
 * Polylines stay encoded over the wire. Decoded coordinate arrays are several
 * times larger as JSON, and the browser has to walk them anyway.
 */
async function fetchShapesFromApi() {
  const responses = await requestPerLine('/route_patterns', {
    'filter[canonical]': 'true',
    include: 'representative_trip.shape',
  });

  const shapes = [];
  const seen = new Set();

  for (const [lineKey, payload] of responses) {
    const included = indexIncluded(payload.included);

    for (const pattern of payload.data ?? []) {
      if (pattern.attributes?.direction_id !== 0) continue;

      const trip = included.get(`trip:${relatedId(pattern, 'representative_trip')}`);
      if (!trip) continue;
      const shape = included.get(`shape:${relatedId(trip, 'shape')}`);
      const polyline = shape?.attributes?.polyline;
      if (!polyline) continue;

      // Branches can share a representative shape; draw each one once.
      if (seen.has(shape.id)) continue;
      seen.add(shape.id);

      shapes.push({
        id: shape.id,
        lineKey,
        routeId: relatedId(pattern, 'route'),
        name: pattern.attributes?.name ?? null,
        polyline,
      });
    }
  }
  return shapes;
}

async function getAlerts() {
  const payload = await request('/alerts', {
    'filter[route_type]': ROUTE_TYPES,
    'filter[datetime]': 'NOW',
  });

  return (payload.data ?? []).map((alert) => {
    const entities = alert.attributes?.informed_entity ?? [];
    // One alert can name many routes; dedupe to the lines a reader cares about.
    const lineKeys = [...new Set(entities.map((e) => lineKeyForRoute(e.route)).filter(Boolean))];

    return {
      id: alert.id,
      header: alert.attributes?.header ?? 'MBTA alert',
      description: alert.attributes?.description ?? null,
      effect: alert.attributes?.effect ?? null,
      severity: alert.attributes?.severity ?? 0,
      serviceEffect: alert.attributes?.service_effect ?? null,
      url: alert.attributes?.url ?? null,
      updatedAt: alert.attributes?.updated_at ?? null,
      lineKeys,
    };
  });
}

module.exports = {
  getVehicles,
  fetchStationsFromApi,
  fetchShapesFromApi,
  getAlerts,
  UpstreamError,
};
