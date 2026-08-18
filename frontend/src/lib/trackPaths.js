/**
 * Snapping vehicles to track geometry, so an animated train follows the rails
 * instead of cutting straight across the Charles.
 *
 * Everything works in a local planar frame measured in metres. Over a metro area
 * an equirectangular projection is accurate to well under a metre, which is far
 * below the precision of the positions themselves, and it makes projection and
 * distance plain arithmetic.
 */

import { decodePolyline } from './polyline.js';

// Boston. Only the cosine of this latitude matters, and it barely moves across
// the system, so one reference latitude is enough.
const ORIGIN_LAT = 42.36;
const METRES_PER_DEG_LAT = 110574;
const METRES_PER_DEG_LNG = 111320 * Math.cos((ORIGIN_LAT * Math.PI) / 180);

const toX = (lng) => lng * METRES_PER_DEG_LNG;
const toY = (lat) => lat * METRES_PER_DEG_LAT;
const toLng = (x) => x / METRES_PER_DEG_LNG;
const toLat = (y) => y / METRES_PER_DEG_LAT;

/**
 * Precomputes, per route, the planar vertices of each of its shapes plus the
 * cumulative distance to each vertex. The cumulative array is what makes "the
 * point 900m along this track" an O(log n) lookup.
 *
 * Keyed by route rather than by line so a vehicle is only ever matched against
 * its own route's geometry. With 149 bus routes under one Bus line, a per-line
 * index would mean scanning every bus route in the city for every bus.
 */
export function buildTrackIndex(shapes) {
  const byRoute = new Map();

  for (const shape of shapes) {
    const latlngs = decodePolyline(shape.polyline);
    if (latlngs.length < 2) continue;

    const count = latlngs.length;
    const xs = new Float64Array(count);
    const ys = new Float64Array(count);
    const cumulative = new Float64Array(count);

    for (let i = 0; i < count; i++) {
      xs[i] = toX(latlngs[i][1]);
      ys[i] = toY(latlngs[i][0]);
      if (i > 0) {
        cumulative[i] =
          cumulative[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
      }
    }

    const entry = { id: shape.id, xs, ys, cumulative, length: cumulative[count - 1] };
    if (!byRoute.has(shape.routeId)) byRoute.set(shape.routeId, []);
    byRoute.get(shape.routeId).push(entry);
  }

  return byRoute;
}

/** Squared perpendicular distance to a segment, plus how far along it fell. */
function projectOntoSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;

  // Degenerate segments do occur in the published shapes.
  let t = lengthSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;

  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return { distanceSq: ex * ex + ey * ey, t };
}

/** Nearest point on one shape, as a distance along that shape. */
function projectOntoPath(entry, px, py) {
  const { xs, ys, cumulative } = entry;
  let bestSq = Infinity;
  let bestAlong = 0;

  for (let i = 1; i < xs.length; i++) {
    const { distanceSq, t } = projectOntoSegment(px, py, xs[i - 1], ys[i - 1], xs[i], ys[i]);
    if (distanceSq < bestSq) {
      bestSq = distanceSq;
      bestAlong = cumulative[i - 1] + t * (cumulative[i] - cumulative[i - 1]);
    }
  }

  return { distanceSq: bestSq, along: bestAlong };
}

// Beyond this a position is treated as not being on the track at all, so the
// caller falls back to a straight line rather than snapping somewhere wrong.
const MAX_SNAP_METRES = 150;

// If the previously matched shape still fits this well, the other shapes are not
// scanned. Trunk-sharing branches mean a vehicle usually stays on one shape for
// its whole trip, so this skips most of the work.
const GOOD_ENOUGH_METRES = 25;

/**
 * Finds where a vehicle sits on its own route's track.
 * `preferredPathId` is the shape it matched last time, checked first.
 */
export function projectVehicle(index, routeId, lat, lng, preferredPathId) {
  const paths = index.get(routeId);
  if (!paths || paths.length === 0) return null;

  const px = toX(lng);
  const py = toY(lat);

  if (preferredPathId) {
    const preferred = paths.find((path) => path.id === preferredPathId);
    if (preferred) {
      const hit = projectOntoPath(preferred, px, py);
      if (hit.distanceSq <= GOOD_ENOUGH_METRES * GOOD_ENOUGH_METRES) {
        return { path: preferred, along: hit.along, offset: Math.sqrt(hit.distanceSq) };
      }
    }
  }

  let best = null;
  for (const path of paths) {
    const hit = projectOntoPath(path, px, py);
    if (!best || hit.distanceSq < best.distanceSq) best = { ...hit, path };
  }

  if (!best || best.distanceSq > MAX_SNAP_METRES * MAX_SNAP_METRES) return null;
  return { path: best.path, along: best.along, offset: Math.sqrt(best.distanceSq) };
}

/** Index of the last vertex at or before `along`. */
function segmentAt(cumulative, along) {
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (cumulative[mid] <= along) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * The coordinate a given distance along a shape, plus the heading of the track
 * there. `forward` false means the vehicle runs against the shape's direction,
 * which is how the direction-1 trips travel.
 */
export function sampleAlong(entry, along, forward = true) {
  const { xs, ys, cumulative } = entry;
  const clamped = Math.max(0, Math.min(along, entry.length));

  const i = segmentAt(cumulative, clamped);
  const j = Math.min(i + 1, xs.length - 1);
  const span = cumulative[j] - cumulative[i];
  const t = span === 0 ? 0 : (clamped - cumulative[i]) / span;

  const x = xs[i] + t * (xs[j] - xs[i]);
  const y = ys[i] + t * (ys[j] - ys[i]);

  let dx = xs[j] - xs[i];
  let dy = ys[j] - ys[i];
  if (!forward) {
    dx = -dx;
    dy = -dy;
  }

  // Compass bearing: clockwise from north, which is what the marker CSS rotates by.
  const heading = (Math.atan2(dx, dy) * 180) / Math.PI;

  return {
    lat: toLat(y),
    lng: toLng(x),
    heading: (heading + 360) % 360,
  };
}
