// Presentation for each line the proxy can return in `lineKey`. The proxy owns
// the route-id-to-line mapping; this file owns only how a line looks, where it
// sits in the filter, and whether it needs the bus feed.

export const LINES = [
  { key: 'Red', label: 'Red', color: '#DA291C' },
  { key: 'Orange', label: 'Orange', color: '#ED8B00' },
  { key: 'Blue', label: 'Blue', color: '#003DA5' },
  { key: 'Green', label: 'Green', color: '#00843D' },
  // MBTA publishes Mattapan as #DA291C, the same as the Red Line, since it is
  // officially a Red Line branch. It gets its own shade here so its chip, its
  // track, and its trolleys are tellable apart from Red on the map.
  { key: 'Mattapan', label: 'Mattapan', color: '#B5493F' },
  { key: 'CR', label: 'Commuter Rail', color: '#80276C' },
  // Silver Line is bus rapid transit, so it rides the bus feed, but MBTA brands
  // it separately and this is its official colour.
  { key: 'SL', label: 'Silver Line', color: '#7C878E', mode: 'bus' },
  // MBTA's bus yellow is #FFC72C, which is close to invisible as a small marker
  // on a pale basemap. This is the same hue carried far enough down to hold up
  // against light grey tiles.
  { key: 'Bus', label: 'Bus', color: '#C77E00', mode: 'bus' },
];

export const LINE_KEYS = LINES.map((line) => line.key);

// Bus is several times the rail fleet and is off until asked for, so the feed is
// only fetched when one of these is enabled.
export const BUS_LINE_KEYS = LINES.filter((line) => line.mode === 'bus').map((line) => line.key);

// What the map shows on a first visit: rail only, which keeps the opening view
// fast and readable.
export const DEFAULT_LINE_KEYS = LINES.filter((line) => line.mode !== 'bus').map((line) => line.key);

const BY_KEY = new Map(LINES.map((line) => [line.key, line]));

export function lineColor(lineKey) {
  return BY_KEY.get(lineKey)?.color ?? '#5b6b7c';
}

export function lineLabel(lineKey) {
  return BY_KEY.get(lineKey)?.label ?? lineKey;
}

export function isBusLine(lineKey) {
  return BY_KEY.get(lineKey)?.mode === 'bus';
}
