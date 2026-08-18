// Upstream MBTA v3 client. Everything the browser needs is normalized here so
// the frontend never parses JSON:API relationships, and so a single upstream
// call replaces the three duplicate ones the old map made per refresh.

const { lineKeyForRoute, RAIL_ROUTE_TYPES, BUS_ROUTE_TYPE } = require('./lines');

const MBTA_BASE = 'https://api-v3.mbta.com';


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

/**
 * Live vehicles for the given route types.
 *
 * Rail and bus are fetched separately on purpose. Bus is 400 vehicles off peak
 * and closer to 900 at rush hour, several times the rail fleet, and it is off by
 * default in the UI. Folding it into the rail response would make every poll pay
 * for data most visitors never ask for.
 */
async function getVehicles(routeTypes) {
  // Folding stops, routes, and trips into this one response replaces the three
  // separate calls the old map made on every refresh.
  const payload = await request('/vehicles', {
    'filter[route_type]': routeTypes,
    include: 'stop,route,trip',
  });
  const included = indexIncluded(payload.included);

  const vehicles = [];
  for (const vehicle of payload.data ?? []) {
    const { latitude, longitude } = vehicle.attributes ?? {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

    const routeId = relatedId(vehicle, 'route');
    const route = included.get(`route:${routeId}`);
    const lineKey = lineKeyForRoute(routeId, route?.attributes?.type);
    if (!lineKey) continue;

    const stop = included.get(`stop:${relatedId(vehicle, 'stop')}`);
    const trip = included.get(`trip:${relatedId(vehicle, 'trip')}`);
    const directionId = vehicle.attributes.direction_id;

    vehicles.push({
      id: vehicle.id,
      lineKey,
      routeId,
      // Green-B reads better as "B" on a marker than "Green-B", and a bus is
      // known by its number, which is exactly what short_name holds.
      badge: routeId.startsWith('Green')
        ? routeId.slice(-1)
        : route?.attributes?.short_name || null,
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
async function getRoutesByLine(routeTypes) {
  const payload = await request('/routes', { 'filter[type]': routeTypes });

  const byLine = new Map();
  for (const route of payload.data ?? []) {
    const lineKey = lineKeyForRoute(route.id, route.attributes?.type);
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
 * Commuter Rail has thirteen routes and bus has 143, so the chunking matters.
 */
async function requestPerLine(path, extraParams = {}, routeTypes = RAIL_ROUTE_TYPES) {
  const byLine = await getRoutesByLine(routeTypes);

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
async function fetchShapesFromApi(routeTypes = RAIL_ROUTE_TYPES) {
  // MBTA marks only rail patterns canonical, so asking for canonical bus
  // patterns returns nothing at all. Rail keeps the canonical filter, which
  // yields exactly the branch set; bus falls back to picking a representative
  // pattern per route below.
  const isBus = String(routeTypes) === BUS_ROUTE_TYPE;
  const responses = await requestPerLine(
    '/route_patterns',
    {
      include: 'representative_trip.shape',
      ...(isBus ? {} : { 'filter[canonical]': 'true' }),
    },
    routeTypes,
  );

  const shapes = [];
  const seenShape = new Set();

  for (const [lineKey, payload] of responses) {
    const included = indexIncluded(payload.included);

    // Group by route so one representative pattern can be chosen per route
    // rather than drawing every variant of every route.
    const byRoute = new Map();
    for (const pattern of payload.data ?? []) {
      // Direction 1 is the same road described backwards.
      if (pattern.attributes?.direction_id !== 0) continue;
      const routeId = relatedId(pattern, 'route');
      if (!routeId) continue;
      // Shuttle-* routes are replacement buses run during a diversion. MBTA
      // attaches them to the line they replace, so without this an Orange Line
      // shape would be drawn along the roads the shuttle uses.
      if (routeId.startsWith('Shuttle')) continue;
      if (!byRoute.has(routeId)) byRoute.set(routeId, []);
      byRoute.get(routeId).push(pattern);
    }

    for (const [routeId, patterns] of byRoute) {
      // Rail publishes canonical patterns, which are exactly the branch set.
      // Bus does not, so fall back to typicality 1, the pattern MBTA considers
      // the route's normal service.
      const canonical = patterns.filter((x) => x.attributes?.canonical === true);
      const typical = patterns.filter((x) => x.attributes?.typicality === 1);
      const chosen = canonical.length ? canonical : typical.length ? typical : patterns.slice(0, 1);

      for (const pattern of chosen) {
        const trip = included.get(`trip:${relatedId(pattern, 'representative_trip')}`);
        if (!trip) continue;
        const shape = included.get(`shape:${relatedId(trip, 'shape')}`);
        const polyline = shape?.attributes?.polyline;
        if (!polyline) continue;

        // Branches can share a representative shape; draw each one once.
        if (seenShape.has(shape.id)) continue;
        seenShape.add(shape.id);

        shapes.push({
          id: shape.id,
          lineKey,
          routeId,
          name: pattern.attributes?.name ?? null,
          polyline,
        });
      }
    }
  }
  return shapes;
}

async function getAlerts() {
  const payload = await request('/alerts', {
    'filter[route_type]': `${RAIL_ROUTE_TYPES},${BUS_ROUTE_TYPE}`,
    'filter[datetime]': 'NOW',
  });

  return (payload.data ?? []).map((alert) => {
    const entities = alert.attributes?.informed_entity ?? [];
    // One alert can name many routes; dedupe to the lines a reader cares about.
    const lineKeys = [
      ...new Set(entities.map((e) => lineKeyForRoute(e.route, e.route_type)).filter(Boolean)),
    ];

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
