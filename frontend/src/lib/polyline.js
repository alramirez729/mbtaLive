/**
 * Decodes an encoded polyline into [lat, lng] pairs.
 *
 * MBTA ships track geometry in Google's encoded polyline format at precision 5.
 * Each value is stored as a delta from the previous one, split into 5-bit chunks
 * that are offset by 63 so they land in printable ASCII, with bit 6 set on every
 * chunk except the last. Negative deltas are inverted and left-shifted by one.
 *
 * This is about twenty lines, so it replaces a dependency.
 */
export function decodePolyline(encoded) {
  if (!encoded) return [];

  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // One signed delta, LSB-first in 5-bit chunks.
    const readDelta = () => {
      let result = 0;
      let shift = 0;
      let chunk;
      do {
        chunk = encoded.charCodeAt(index++) - 63;
        result |= (chunk & 0x1f) << shift;
        shift += 5;
      } while (chunk >= 0x20);
      // Odd values encode negatives, so the sign lives in bit 0.
      return result & 1 ? ~(result >> 1) : result >> 1;
    };

    lat += readDelta();
    lng += readDelta();
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
