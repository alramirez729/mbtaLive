// Presentation for each line the proxy can return in `lineKey`. The proxy owns
// the route-id-to-line mapping; this file owns only how a line looks and where
// it sits in the filter bar.

export const LINES = [
  { key: 'Red', label: 'Red', color: '#DA291C' },
  { key: 'Orange', label: 'Orange', color: '#ED8B00' },
  { key: 'Blue', label: 'Blue', color: '#003DA5' },
  { key: 'Green', label: 'Green', color: '#00843D' },
  { key: 'Mattapan', label: 'Mattapan', color: '#B5493F' },
  { key: 'CR', label: 'Commuter Rail', color: '#80276C' },
];

export const LINE_KEYS = LINES.map((line) => line.key);

const BY_KEY = new Map(LINES.map((line) => [line.key, line]));

export function lineColor(lineKey) {
  return BY_KEY.get(lineKey)?.color ?? '#5b6b7c';
}

export function lineLabel(lineKey) {
  return BY_KEY.get(lineKey)?.label ?? lineKey;
}
