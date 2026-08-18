# MBTA Live

A live map of MBTA rail vehicles plus current service alerts. Data comes from the
[MBTA v3 API](https://api-v3.mbta.com/docs/swagger/index.html) through a small
caching proxy.

Covers Red, Orange, Blue, Green (all four branches), Mattapan, Commuter Rail, the
Silver Line, and bus. Ferries are out of scope.

## Layout

Two pages: `/subway` for rail, `/bus` for bus. `/` redirects to `/subway`.

```
frontend/            Vite + React single-page app
  src/pages/           SubwayPage and BusPage
  src/components/      MapView, Panel and panel contents, shared by both pages
backend/server/      Express caching proxy for the MBTA API
  data/stations.json   committed station snapshot (see below)
  data/shapes.json     committed rail track geometry snapshot
  data/bus-shapes.json committed bus route geometry snapshot
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

## Bus

`/bus` is its own page, because bus needs a route directory and a drill-down that
rail has no use for, and one combined filter list served neither well.

The page opens showing every bus. Pick a route from the searchable directory
(searchable by number, name, or town) and the map narrows to that route: its path,
its stops, its live buses, and the view frames itself to the route. The selection
lives in the URL as `?route=111`, so a route is linkable and the back button steps
out of it.

Each route's detail shows:

- **Direction**, named the way the route names it. Bus is Outbound/Inbound, but
  rail is not (the Red Line is South/North), so the label is read from the route
  rather than assumed. Live count per direction, and either can be isolated.
- **Rail connections**, and which stations they happen at. Route 1 meets Red at
  Central and Harvard, Orange at Massachusetts Avenue, Green at Hynes and Symphony.
  144 of 149 routes have at least one.
- **Towns served**, from the stops' `municipality`. Neighbourhood-level geography
  (Allston, Roxbury) is not in the MBTA API and would need city open data.

Connections are computed with no extra requests, by intersecting each route's stops
against the rail station snapshot, which already records the lines at each station.
Two sources are needed and neither alone is enough: MBTA's `connecting_stops`
covers a street stop outside a station (route 1 at Harvard), while a route that
pulls into the station itself is not "connecting" because the rider is already
there (SL1 stops at `place-sstat`). It is an exact id match, not a distance guess.
Bus stops carry no `parent_station`, which closes the obvious route to the answer.

Bus is a different scale from rail: **400 vehicles off peak against 110 rail**,
149 routes against 21, and 6,892 stops against 232 stations. That shapes several
decisions:

- **Separate feeds.** `/api/buses`, `/api/bus-shapes`, and `/api/bus-routes` are
  only requested on `/bus`, so a visit to `/subway` never pays for them. Bus
  geometry alone is 83KB gzipped.
- **Stops are fetched per route**, on selection. All 149 routes together is 10,500
  stops and 1.2MB, and the page only ever shows the one route in view.
- **In the overview, bus geometry is zoom-gated** to zoom 14 and above: all 176
  shapes at region scale is an unreadable web, but it is useful once you are down
  at neighbourhood level. A route you have actually chosen draws at any zoom.
- **Bus stops are not drawn in the overview.** 6,892 markers would bury the map.

Buses render smaller, softer, and in their own map pane below the rail markers.
Without that they outnumber trains four to one and visually bury the network they
are meant to sit behind. Their markers carry no label, because a route number like
`116` does not fit in a marker; the popup leads with it instead.

The Silver Line is bus rapid transit, so it arrives on the bus feed as route_type
3, but MBTA brands it separately and it gets its own colour, the official
`#7C878E`. MBTA distinguishes its six routes (741, 742, 743, 746, 749, 751) from
the other 143 only by colour.

Two upstream quirks worth knowing:

- **Bus route patterns are never `canonical`.** Only rail is, so
  `filter[canonical]=true` returns nothing for bus. Bus uses `typicality: 1`, the
  pattern MBTA treats as the route's normal service.
- **`Shuttle-*` routes are excluded.** These are replacement buses run during a
  diversion, and MBTA attaches them to the line they replace, so including them
  drew an Orange Line shape along the roads a shuttle happened to use.

## Hover to highlight

Pointing at a line in Filters, or a route in the bus directory, thickens that
geometry and fades everything else back. Hovering the geometry on the map does the
same, so the two directions agree.

Hovering something that is not currently drawn shows it anyway, dashed: a line whose
checkbox is off, or a bus route the zoom gate is holding back. That makes the bus
directory browsable without committing to a route, since at region zoom no bus
geometry is drawn at all.

Highlighting restyles the existing polylines in place rather than rebuilding them.
With 176 bus shapes, rebuilding on every pointer move would stutter.

## Help

A `?` beside Filters and Alerts opens a panel explaining how to drive the map. It is
page-aware: the subway version covers focusing a line and the checkboxes, the bus
version covers searching routes and splitting by direction, and a shared section
covers switching networks, popups, heading arrows, alerts, and smooth motion.

It reuses the same Panel as Filters and Alerts, so it is a card on desktop and a
sheet on a phone, and only one of the three is open at a time.

## The first view

`/subway` opens focused on the Blue Line with the Filters panel showing, rather than
on the whole network with everything closed. Six lines and 110 trains at once does
not explain itself; one line, framed, sitting next to the highlighted control that
framed it does. "All lines" expands to the full network.

Blue is the pick because it is the shortest and simplest line, so the framing reads
clearly and nothing overlaps.

Two things this needed:

- A panel that starts open counts as **pinned**, otherwise the first stray pointer
  movement across and away from it would dismiss it.
- `fitBounds` had to learn what is covering the map. An open bottom sheet takes most
  of a phone screen, and framing a line without accounting for it centred the Blue
  Line underneath the sheet, leaving a new rider looking at an empty strip. The fit
  now measures the open sheet and keeps the line above it, capped at 45% of the map
  so the remaining strip stays tall enough to frame anything into.

## Focusing one line

Clicking a line row on `/subway` isolates that line and frames the whole of it,
the same move as picking a bus route. Each row carries two actions, because the two
are genuinely different questions:

- **The row** isolates the line and zooms to fit it, from Bowdoin to Wonderland for
  Blue, or out to Providence and Worcester for Commuter Rail.
- **The checkbox** shows or hides that line without moving the map, so several
  lines can be compared at once.

Hand-picking with the checkboxes clears the focus highlight, since the view is then
no longer focused on any one line. "All lines" restores everything.

The extent comes from the stations already loaded, not from the geometry, and a
counter in the focus state means clicking the same line again re-frames it rather
than doing nothing.

## Station labels

Station names appear beside their dots on `/subway` once you zoom past 15, the same
progressive-disclosure idea as the bus geometry gate. Below that they are hidden;
without the gate 232 names collide into mush at region scale.

The threshold is one step tighter than the bus gate (15 against 14) because names
need more room than lines do. At 14 the Green Line surface stops through Brookline
and Longwood sit a couple of hundred metres apart and their labels pile onto each
other.

Labels are permanent Leaflet tooltips bound once and shown or hidden in CSS, rather
than markers being rebuilt on every zoom change. Two details worth knowing if you
touch them:

- **Leaflet writes tooltip opacity as an inline style**, so hiding them needs
  `!important`. No selector specificity can outrank an inline style.
- They are `pointer-events: none`, so a click belongs to the dot underneath.

Bus stops deliberately get no labels: names like "Massachusetts Ave opp Holyoke St"
are far too long to sit beside a dot.

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
| `GET /api/shapes` | 24h | Rail track geometry as encoded polylines, also from a snapshot |
| `GET /api/bus-shapes` | 24h | Bus route geometry, 176 shapes, also opt-in |
| `GET /api/bus-routes` | 24h | Route directory: towns served and rail connections |
| `GET /api/bus-stops?route=1` | 24h | Stops for one route, fetched on selection |

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
