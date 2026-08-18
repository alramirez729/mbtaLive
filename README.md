# MBTA Live

A live map of MBTA rail vehicles plus current service alerts. Data comes from the
[MBTA v3 API](https://api-v3.mbta.com/docs/swagger/index.html) through a small
caching proxy.

Covers Red, Orange, Blue, Green (all four branches), Mattapan, and Commuter Rail.
Buses and ferries are out of scope.

## Layout

```
frontend/            Vite + React single-page app
backend/server/      Express caching proxy for the MBTA API
  data/stations.json   committed station snapshot (see below)
  data/shapes.json     committed track geometry snapshot
api/[[...path]].js   Vercel entry point; hands the same Express app to a function
_archive/            the old user accounts feature, kept for reference only
```

There is no database. Accounts, notes, highlights, and favorites were removed;
their code sits unreferenced in `_archive/` and nothing imports, builds, or
deploys it. See [_archive/README.md](_archive/README.md).

## Running locally

```bash
npm install     # once, from this directory (npm workspaces)
npm run dev     # proxy on :8081, app on :8096
```

Open http://localhost:8096. The app only ever calls `/api/*` on its own origin;
in development Vite forwards that to the proxy, so there is no environment-specific
base URL to configure.

Run the two halves separately with `npm run dev:proxy` and `npm run dev:web`.

## The MBTA API key

Set one. It is free, instant, and the difference between 20 requests/minute and
1000:

1. Register at https://api-v3.mbta.com/register
2. Put it in `.env` as `MBTA_API_KEY=...` locally, and in the environment
   variables of whatever host you deploy to.

`GET /api/health` reports whether the running instance found a key.

Without a key the proxy still works. Its cache and the CDN absorb most repeat
traffic, but a handful of simultaneous visitors can trip the anonymous limit,
which surfaces as a "Live feed interrupted" banner while the map keeps showing
the last known positions.

## Endpoints

| Route | Cache | Notes |
| --- | --- | --- |
| `GET /api/health` | none | Status and whether an API key is configured |
| `GET /api/mbta/vehicles` | 5s | Normalized live positions |
| `GET /api/mbta/alerts` | 60s | Alerts currently in effect |
| `GET /api/mbta/stations` | 24h | Served from the committed snapshot, no upstream call |
| `GET /api/mbta/shapes` | 24h | Track geometry as encoded polylines, also from a snapshot |

Responses are normalized, so the browser never parses JSON:API relationships.
Each endpoint also sets `s-maxage`, which lets Vercel's CDN serve most repeat hits.

### The static snapshots

`data/stations.json` (232 stations) and `data/shapes.json` (26 track polylines)
change on the order of years, but building them costs about twenty upstream
requests, because `filter[route]` returns wrong results past four route ids and
Commuter Rail has thirteen routes. Paying that on every cold start is what the
snapshots avoid.

Regenerate both after a service change (a line extension, a new infill stop):

```bash
npm run refresh:static --workspace @mbtalive/proxy
```

Track geometry comes from canonical route patterns rather than raw shapes. A
route has many near-duplicate shape variants (twelve for the Red Line), while the
canonical patterns are the small representative set: two for Red, one per Green
branch. Only direction 0 is kept, since direction 1 is the same track backwards.

Polylines stay encoded over the wire and are decoded in the browser by
[frontend/src/lib/polyline.js](frontend/src/lib/polyline.js). Decoded coordinate
arrays are several times larger as JSON, and the browser walks them anyway.

### Line colors

[frontend/src/lib/lines.js](frontend/src/lib/lines.js) is the single source of
truth for line color, and the proxy deliberately does not send one per vehicle.
MBTA reports Mattapan as `#DA291C`, identical to the Red Line, because it is
officially a Red Line branch. It gets its own shade here so its filter chip, its
track, and its trolleys are tellable apart from Red.

## Deploying

### Vercel

`vercel.json` builds the frontend to `frontend/dist` and serves `api/` as one
serverless function. Set the project's root directory to this folder, and set
`MBTA_API_KEY` in the project's environment variables.

### Render

`backend/server` still runs standalone, so the existing service keeps working:
build with `npm install`, start with `npm start`. Nothing in the Vercel setup
breaks it, so the two can overlap during the transition.
