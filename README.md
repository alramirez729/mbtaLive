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
  .env                 MBTA_API_KEY lives here (see .env.example)
api/[path].js   Vercel entry point; hands the same Express app to a function
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

## Motion

Vehicle records only refresh upstream every ~18 seconds, and 74% of consecutive
samples show a vehicle in the same place, so raw positions arrive as jumps of up
to a kilometre. The **Motion** toggle smooths them.

Trains are snapped onto the track geometry and interpolated *along the rails*
between two known positions, not tweened in a straight line. Measured against
real consecutive samples, that keeps a train exactly on the centreline (0.0m
deviation) where a straight tween strays an average of 13m and up to 76m, which
is visibly off-track at city zoom. 99% of live vehicles snap to a shape, at a
cost of 0.05ms each; the 1% that do not fall back to a straight line.

This interpolates between *known* positions rather than extrapolating ahead of
them, which is deliberate. Dead reckoning along the reported bearing would invent
movement for the majority of trains, because a vehicle whose record simply has not
refreshed is indistinguishable from a stationary one, and `speed` is populated for
only 37% of vehicles. The tradeoff is that a train lags reality slightly, which it
already did.

Each glide is paced by how long that vehicle actually took to cover the distance,
stretched by 1.8x. Upstream refresh gaps are uneven (median 11s, sometimes 40s+),
so a glide sized to the previous gap frequently ended before the next update
arrived, which read as a train moving then freezing. Overshooting costs nothing,
because the next update retargets from wherever the marker has reached without a
jump. Measured effect: position changes per marker over 40s went from 27 to 173,
and the p90 pause between movements from 10.4s to 2.0s. Trains that genuinely
dwell still stop, which is the point.

Consequences worth knowing:

- Movement under 4m is treated as noise and not animated, so dwelling trains sit still.
- A jump over 4km is applied instantly; at a 5s poll that speed is impossible, so
  it means the feed skipped or the vehicle was reassigned.
- While gliding, the heading arrow follows the direction of travel along the track
  rather than the reported bearing, which is stale or absent for some vehicles.
- If a vehicle changes shape between samples (a Green Line branch reassignment),
  it snaps, because interpolating between two different geometries is meaningless.

Turning **Motion** off makes markers jump straight to each reported position. With
110 markers animating, the render loop measured a steady 164fps with a p95 frame
gap of 6.2ms, but the toggle is there if a device struggles.

## The MBTA API key

Set one. It is free, instant, and the difference between 20 requests/minute and
1000:

1. Register at https://api-v3.mbta.com/register
2. Put it in `backend/server/.env` as `MBTA_API_KEY=...` locally (copy
   `backend/server/.env.example`), and in the environment variables of whatever
   host you deploy to. Node reads the file natively, so there is no `dotenv`
   dependency.

`GET /api/health` reports whether the running instance found a key.

Without a key the proxy still works. Its cache and the CDN absorb most repeat
traffic, but a handful of simultaneous visitors can trip the anonymous limit,
which surfaces as a "Live feed interrupted" banner while the map keeps showing
the last known positions.

## Endpoints

| Route | Cache | Notes |
| --- | --- | --- |
| `GET /api/health` | none | Status and whether an API key is configured |
| `GET /api/vehicles` | 2.5s | Normalized live positions |
| `GET /api/alerts` | 60s | Alerts currently in effect |
| `GET /api/stations` | 24h | Served from the committed snapshot, no upstream call |
| `GET /api/shapes` | 24h | Track geometry as encoded polylines, also from a snapshot |

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
