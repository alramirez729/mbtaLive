import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isBusLine, lineColor, lineLabel } from '../lib/lines';
import { decodePolyline } from '../lib/polyline';
import { buildTrackIndex, projectVehicle, sampleAlong } from '../lib/trackPaths';

const BOSTON_CENTER = [42.3601, -71.0589];
const DEFAULT_ZOOM = 12;

// 176 bus route shapes drawn over the whole region is an unreadable grey web, and
// most of them are off screen anyway. Below this zoom bus geometry is hidden and
// only the vehicles show.
const BUS_ROUTE_MIN_ZOOM = 14;

// How far unhighlighted geometry steps back while something else is emphasised.
const DIMMED_OPACITY = 0.18;

// Marks geometry shown only as a hover preview.
const DASH_PREVIEW = '6 5';

// One step tighter than the bus geometry gate, because names need more room than
// lines do. At 14 the Green Line surface stops through Brookline and Longwood are
// only a couple of hundred metres apart and their labels pile onto each other; at
// 15 they separate cleanly.
const STATION_LABEL_MIN_ZOOM = 15;

// Movement smaller than this is GPS noise rather than travel, and animating it
// makes stationary trains shimmer.
const MIN_ANIMATED_METRES = 4;

// A jump this large means the feed skipped or a vehicle was reassigned. Gliding
// it would look like a rocket, so it is applied instantly instead.
const MAX_ANIMATED_METRES = 4000;

// A glide is paced by how long the vehicle took to cover the distance, so it is
// still moving when the next update lands instead of finishing early and freezing.
// Clamped because a first sighting has no previous gap to go on.
const MIN_GLIDE_MS = 2000;
const MAX_GLIDE_MS = 30000;

// Refresh gaps are uneven (median 11s, sometimes 40s+), so a glide sized to the
// previous gap often ends before the next one arrives, which is the visible
// stutter. Stretching it past the last gap keeps the train moving; arriving late
// costs nothing because the next update retargets from wherever it has reached,
// mid-glide and without a jump.
const GLIDE_STRETCH = 1.8;

/** Resting style for a shape. `muted` is the thin region-wide bus treatment. */
function baseStyle(muted) {
  return muted ? { weight: 2.5, opacity: 0.55 } : { weight: 4, opacity: 0.8 };
}

// Any value interpolated into popup or icon markup comes from the MBTA feed, so
// it is escaped rather than trusted.
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vehicleIconHtml(vehicle, isBus) {
  const color = lineColor(vehicle.lineKey);
  const hasBearing = typeof vehicle.bearing === 'number';
  const bearing = hasBearing ? vehicle.bearing : 0;
  const heading = hasBearing ? '<span class="vehicle__heading"></span>' : '';
  // "B" fits inside a marker; "116" and "SL3" do not, and there are hundreds of
  // buses, so they stay as plain dots and carry the number in the popup instead.
  const badge = !isBus && vehicle.badge?.length === 1 ? esc(vehicle.badge) : '';
  return `<div class="vehicle${isBus ? ' vehicle--bus' : ''}" style="--line-color:${esc(
    color,
  )};--bearing:${bearing}deg">
    ${heading}
    <span class="vehicle__body">${badge}</span>
  </div>`;
}

function vehicleIcon(vehicle) {
  const isBus = isBusLine(vehicle.lineKey);
  const size = isBus ? 14 : 26;
  return L.divIcon({
    className: 'vehicle-icon',
    html: vehicleIconHtml(vehicle, isBus),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 1],
  });
}

function vehiclePopup(vehicle) {
  const color = lineColor(vehicle.lineKey);
  // "stopped at" plus "Park Street" reads as one sentence, so the two are joined.
  const where = vehicle.stopName
    ? `${esc(vehicle.status)} ${esc(vehicle.stopName)}`
    : esc(vehicle.status);
  // A train approaching its own terminus would otherwise read "in transit to
  // South Station" directly above "Toward South Station".
  const headsign =
    vehicle.headsign && vehicle.headsign !== vehicle.stopName
      ? `<p class="popup__row"><span>Toward</span> ${esc(vehicle.headsign)}</p>`
      : '';
  const label = vehicle.label
    ? `<p class="popup__row"><span>Car</span> ${esc(vehicle.label)}</p>`
    : '';

  // A bus is known by its number, so lead with that rather than the long
  // "Wonderland Station - Maverick Station" name.
  const title = isBusLine(vehicle.lineKey) && vehicle.badge
    ? `${esc(vehicle.badge)} · ${esc(vehicle.routeName)}`
    : esc(vehicle.routeName);

  return `<div class="popup">
    <p class="popup__title" style="--line-color:${esc(color)}">${title}</p>
    <p class="popup__lead">${where}</p>
    ${headsign}
    ${label}
  </div>`;
}

function stationPopup(station) {
  const description = station.description
    ? `<p class="popup__lead">${esc(station.description)}</p>`
    : '';
  const municipality = station.municipality
    ? `<p class="popup__row"><span>In</span> ${esc(station.municipality)}</p>`
    : '';

  return `<div class="popup">
    <p class="popup__title popup__title--plain">${esc(station.name)}</p>
    ${description}
    ${municipality}
  </div>`;
}

function routePopup(shape) {
  const branch = shape.name ? `<p class="popup__lead">${esc(shape.name)}</p>` : '';
  return `<div class="popup">
    <p class="popup__title" style="--line-color:${esc(lineColor(shape.lineKey))}">${esc(
      lineLabel(shape.lineKey),
    )}</p>
    ${branch}
  </div>`;
}

// Decoding 16k coordinates is not free, and the geometry never changes, so the
// results are cached at module scope rather than per mount.
const decodedPaths = new Map();

/** Rotates a marker's heading arrow without rebuilding the icon's DOM. */
function applyHeading(marker, degrees) {
  const element = marker.getElement()?.firstElementChild;
  if (element) element.style.setProperty('--bearing', `${degrees}deg`);
}

export default function MapView({
  vehicles,
  stations,
  shapes,
  activeLines,
  showStations,
  showRoutes,
  showMotion,
  motionDurationMs,
  // Points to frame when the selection changes. Without this, picking a route
  // that runs through Chelsea leaves you staring at Brookline.
  fitPoints,
  // Reveal station names once zoomed in. Rail station names are short enough to
  // sit beside a dot; bus stop names ("Massachusetts Ave opp Holyoke St") are not.
  stationLabels = false,
  // What the pointer is over in a panel, by line or by single route. The matching
  // geometry is emphasised and everything else steps back.
  highlightLineKey = null,
  highlightRouteId = null,
  // The bus page draws one route at a time, which is legible at any zoom. The
  // gate exists for the region-wide view, not for a single route.
  alwaysShowRoutes = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // One layer group per line, so toggling a line is a single add/remove of a
  // group rather than a rebuild of its markers.
  const vehicleLayersRef = useRef(new Map());
  const stationLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  // Drawn polylines by shape id, so a highlight restyles them in place instead of
  // rebuilding 176 of them on every pointer move.
  const routeLayersRef = useRef(new Map());
  // Geometry shown only because it is being hovered: a line that is switched off,
  // or a bus route the zoom gate is holding back.
  const previewLayerRef = useRef(null);
  // id -> marker plus its animation state, so each refresh retargets an existing
  // marker instead of clearing and re-creating every marker on the map.
  const markersRef = useRef(new Map());
  const frameRef = useRef(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // Set by hovering geometry on the map, as opposed to a row in a panel.
  const [hoveredShape, setHoveredShape] = useState(null);

  // Track geometry in a planar frame, for snapping vehicles onto the rails.
  const trackIndex = useMemo(() => (shapes ? buildTrackIndex(shapes) : null), [shapes]);

  // Read inside the animation loop, which must not be torn down and rebuilt each
  // time the duration or the toggle changes.
  const motionRef = useRef({ enabled: showMotion, duration: motionDurationMs });
  motionRef.current = { enabled: showMotion, duration: motionDurationMs };

  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: BOSTON_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      // Repeating the world adds nothing for a single-city map.
      worldCopyJump: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: true, metric: false }).addTo(map);

    // Track geometry belongs above the tiles but below the station dots
    // (overlayPane, 400) and the trains (markerPane, 600).
    map.createPane('routes');
    map.getPane('routes').style.zIndex = 350;

    // Buses outnumber trains four to one. Their own pane below markerPane keeps
    // them from burying the rail network they are meant to sit behind.
    map.createPane('busVehicles');
    map.getPane('busVehicles').style.zIndex = 550;

    routeLayerRef.current = L.layerGroup().addTo(map);
    previewLayerRef.current = L.layerGroup().addTo(map);
    stationLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Bus geometry is gated on zoom, so the effect below needs to know it.
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);

    return () => {
      // Without this, a remount (StrictMode, hot reload) throws
      // "Map container is already initialized".
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null;
      vehicleLayersRef.current.clear();
      markersRef.current.clear();
      stationLayerRef.current = null;
      routeLayerRef.current = null;
      routeLayersRef.current.clear();
      previewLayerRef.current = null;
    };
  }, []);

  // One shared animation frame drives every marker in flight. It stops itself as
  // soon as nothing is moving, so an idle map costs nothing.
  const runFrame = () => {
    frameRef.current = null;
    const now = performance.now();
    let stillMoving = false;

    for (const entry of markersRef.current.values()) {
      const animation = entry.animation;
      if (!animation) continue;

      const { startedAt, duration, mode } = animation;
      const progress = duration <= 0 ? 1 : Math.min((now - startedAt) / duration, 1);

      if (mode === 'track') {
        // Linear, deliberately. Easing would make every train appear to brake
        // and accelerate once per poll.
        const along = animation.fromAlong + (animation.toAlong - animation.fromAlong) * progress;
        const point = sampleAlong(animation.path, along, animation.forward);
        entry.marker.setLatLng([point.lat, point.lng]);
        entry.along = along;
        // Direction of travel along the rails beats the reported bearing, which
        // is stale or missing for some vehicles.
        applyHeading(entry.marker, point.heading);
      } else {
        entry.marker.setLatLng([
          animation.fromLat + (animation.toLat - animation.fromLat) * progress,
          animation.fromLng + (animation.toLng - animation.fromLng) * progress,
        ]);
      }

      if (progress >= 1) entry.animation = null;
      else stillMoving = true;
    }

    if (stillMoving) frameRef.current = requestAnimationFrame(runFrame);
  };

  const ensureFrame = () => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(runFrame);
  };

  // Keep vehicle markers in sync with the latest poll.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !vehicles) return;

    const markers = markersRef.current;
    const layers = vehicleLayersRef.current;
    const { enabled: animate, duration: defaultDuration } = motionRef.current;

    const layerFor = (lineKey) => {
      let layer = layers.get(lineKey);
      if (!layer) {
        layer = L.layerGroup();
        layers.set(lineKey, layer);
        if (activeLines.has(lineKey)) layer.addTo(map);
      }
      return layer;
    };

    let needsFrame = false;
    const seen = new Set();

    for (const vehicle of vehicles) {
      seen.add(vehicle.id);
      const position = [vehicle.latitude, vehicle.longitude];
      const existing = markers.get(vehicle.id);
      // Checking last poll's shape first usually avoids scanning the others.
      const hit = trackIndex
        ? projectVehicle(
            trackIndex,
            vehicle.routeId,
            vehicle.latitude,
            vehicle.longitude,
            existing?.pathId,
          )
        : null;

      if (!existing) {
        // A vehicle appearing for the first time has no previous position to
        // travel from, so it is placed where it is.
        const marker = L.marker(position, {
          icon: vehicleIcon(vehicle),
          keyboard: false,
          riseOnHover: true,
          pane: isBusLine(vehicle.lineKey) ? 'busVehicles' : 'markerPane',
        }).bindPopup(vehiclePopup(vehicle));
        marker.addTo(layerFor(vehicle.lineKey));
        markers.set(vehicle.id, {
          marker,
          lineKey: vehicle.lineKey,
          bearing: vehicle.bearing,
          pathId: hit?.path.id ?? null,
          along: hit?.along ?? null,
          animation: null,
          updatedAt: vehicle.updatedAt,
          lastUpdateAt: null,
        });
        continue;
      }

      // Upstream refreshes each record every ~18s while this polls every 5s, so
      // most polls repeat a position verbatim. Re-targeting on those would cancel
      // the glide already under way (its animated position has moved on, so the
      // stale report reads as travel in the opposite direction). An unchanged
      // updated_at means there is genuinely nothing new for this vehicle.
      if (animate && existing.updatedAt && existing.updatedAt === vehicle.updatedAt) {
        existing.marker.setPopupContent(vehiclePopup(vehicle));
        continue;
      }

      if (existing.lineKey !== vehicle.lineKey) {
        // Green Line branch reassignments do happen mid-trip.
        layers.get(existing.lineKey)?.removeLayer(existing.marker);
        existing.marker.addTo(layerFor(vehicle.lineKey));
        existing.lineKey = vehicle.lineKey;
        existing.marker.setIcon(vehicleIcon(vehicle));
      }

      const sameTrack = Boolean(hit) && existing.pathId === hit.path.id && existing.along !== null;
      const travelled = sameTrack ? Math.abs(hit.along - existing.along) : 0;

      // How long this vehicle took to cover the distance, which is how long the
      // glide should take. Upstream refreshes each record every ~18s, so pacing
      // to the 5s poll would finish in a quarter of the time and then stall.
      const now = performance.now();
      const sinceLastUpdate = existing.lastUpdateAt ? now - existing.lastUpdateAt : defaultDuration;
      const duration = Math.min(
        Math.max(sinceLastUpdate * GLIDE_STRETCH, MIN_GLIDE_MS),
        MAX_GLIDE_MS,
      );

      if (
        animate &&
        sameTrack &&
        travelled >= MIN_ANIMATED_METRES &&
        travelled <= MAX_ANIMATED_METRES
      ) {
        // Glide along the rails from wherever the marker currently sits.
        existing.animation = {
          mode: 'track',
          path: hit.path,
          fromAlong: existing.along,
          toAlong: hit.along,
          forward: hit.along >= existing.along,
          startedAt: now,
          duration,
        };
        needsFrame = true;
      } else if (animate && !hit) {
        // Off-track: a yard move, or geometry we do not have. A straight line is
        // the honest fallback, since it claims nothing about which rails were used.
        const current = existing.marker.getLatLng();
        const metres = current.distanceTo(L.latLng(position));
        if (metres >= MIN_ANIMATED_METRES && metres <= MAX_ANIMATED_METRES) {
          existing.animation = {
            mode: 'line',
            fromLat: current.lat,
            fromLng: current.lng,
            toLat: vehicle.latitude,
            toLng: vehicle.longitude,
            startedAt: now,
            duration,
          };
          needsFrame = true;
        } else {
          existing.animation = null;
          existing.marker.setLatLng(position);
        }
      } else {
        // Motion is off, the vehicle did not really move, or it changed shape and
        // interpolating between two different geometries would be meaningless.
        existing.animation = null;
        existing.marker.setLatLng(position);
        if (existing.bearing !== vehicle.bearing && typeof vehicle.bearing === 'number') {
          applyHeading(existing.marker, vehicle.bearing);
        }
      }

      existing.updatedAt = vehicle.updatedAt;
      existing.lastUpdateAt = now;
      existing.pathId = hit?.path.id ?? null;
      // While animating, `along` advances frame by frame towards the target, so
      // it must not be overwritten here.
      if (!existing.animation) existing.along = hit?.along ?? null;
      existing.bearing = vehicle.bearing;
      existing.marker.setPopupContent(vehiclePopup(vehicle));
    }

    // Drop vehicles that have gone out of service since the last poll.
    for (const [id, entry] of markers) {
      if (seen.has(id)) continue;
      layers.get(entry.lineKey)?.removeLayer(entry.marker);
      markers.delete(id);
    }

    if (needsFrame) ensureFrame();
  }, [vehicles, activeLines, trackIndex]);

  // Turning motion off mid-glide settles every train on its true position rather
  // than leaving markers stranded between two samples.
  useEffect(() => {
    if (showMotion) return;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    for (const entry of markersRef.current.values()) {
      const animation = entry.animation;
      if (!animation) continue;
      if (animation.mode === 'track') {
        const point = sampleAlong(animation.path, animation.toAlong, animation.forward);
        entry.marker.setLatLng([point.lat, point.lng]);
        entry.along = animation.toAlong;
      } else {
        entry.marker.setLatLng([animation.toLat, animation.toLng]);
      }
      entry.animation = null;
    }
  }, [showMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitPoints || fitPoints.length === 0) return;

    // An open bottom sheet covers most of a phone screen. fitBounds knows nothing
    // about it, so framing a line would centre it underneath the sheet and the
    // rider would see an empty strip of map. Measure whatever is covering the
    // bottom and keep the line above it.
    const sheet = document.querySelector('.panel--sheet.is-open .panel__body');
    const mapHeight = map.getSize().y;
    // Capped: past this the remaining strip is too short to frame anything into.
    const covered = sheet ? Math.min(sheet.offsetHeight, mapHeight * 0.45) : 0;

    map.fitBounds(L.latLngBounds(fitPoints), {
      paddingTopLeft: [40, 60],
      paddingBottomRight: [40, 40 + covered],
      animate: true,
    });
  }, [fitPoints]);

  // Show or hide whole line groups when the filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [lineKey, layer] of vehicleLayersRef.current) {
      const shouldShow = activeLines.has(lineKey);
      if (shouldShow && !map.hasLayer(layer)) layer.addTo(map);
      else if (!shouldShow && map.hasLayer(layer)) map.removeLayer(layer);
    }
  }, [activeLines]);

  // Track geometry is fetched once. Decoding is the only real work here, so the
  // decoded paths are cached per shape id and survive filter and toggle changes.
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    routeLayersRef.current.clear();
    if (!showRoutes || !shapes) return;

    const busVisible = alwaysShowRoutes || zoom >= BUS_ROUTE_MIN_ZOOM;

    for (const shape of shapes) {
      if (!activeLines.has(shape.lineKey)) continue;
      const isBus = isBusLine(shape.lineKey);
      if (isBus && !busVisible) continue;

      const path = decodedPaths.get(shape.id) ?? decodePolyline(shape.polyline);
      decodedPaths.set(shape.id, path);
      if (path.length < 2) continue;

      // Bus routes are thin and faint in the region-wide view, where there are far
      // more of them and they are context behind the rail network. A single focused
      // route is the subject, so it gets full weight.
      const muted = isBus && !alwaysShowRoutes;

      const polyline = L.polyline(path, {
        pane: 'routes',
        color: lineColor(shape.lineKey),
        ...baseStyle(muted),
        // Branches share a trunk, so rounded joins keep the overlap from
        // showing hard corners where two colors meet.
        lineCap: 'round',
        lineJoin: 'round',
      }).bindPopup(routePopup(shape));

      // Hovering the geometry itself highlights it too, not only a panel row.
      polyline.on('mouseover', () =>
        setHoveredShape({ lineKey: shape.lineKey, routeId: shape.routeId }),
      );
      polyline.on('mouseout', () => setHoveredShape(null));

      polyline.addTo(layer);
      routeLayersRef.current.set(shape.id, { polyline, shape, muted });
    }
  }, [shapes, activeLines, showRoutes, zoom, alwaysShowRoutes]);

  const hotLineKey = highlightLineKey ?? hoveredShape?.lineKey ?? null;
  const hotRouteId = highlightRouteId ?? hoveredShape?.routeId ?? null;

  // Emphasise what is highlighted and step everything else back. This restyles in
  // place; rebuilding on every pointer move would stutter with 176 bus shapes.
  useEffect(() => {
    const active = Boolean(hotLineKey || hotRouteId);

    for (const { polyline, shape, muted } of routeLayersRef.current.values()) {
      const base = baseStyle(muted);
      if (!active) {
        polyline.setStyle(base);
        continue;
      }
      const isMatch = hotRouteId ? shape.routeId === hotRouteId : shape.lineKey === hotLineKey;
      polyline.setStyle(
        isMatch
          ? { weight: base.weight + 2.5, opacity: 1 }
          : { weight: base.weight, opacity: DIMMED_OPACITY },
      );
    }
  }, [hotLineKey, hotRouteId, shapes, activeLines, zoom, alwaysShowRoutes, showRoutes]);

  // Geometry that is not currently drawn but is being hovered, so pointing at a
  // switched-off line or a zoomed-out bus route still shows its path.
  useEffect(() => {
    const layer = previewLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showRoutes || !shapes || (!hotLineKey && !hotRouteId)) return;

    for (const shape of shapes) {
      const isMatch = hotRouteId ? shape.routeId === hotRouteId : shape.lineKey === hotLineKey;
      if (!isMatch || routeLayersRef.current.has(shape.id)) continue;

      const path = decodedPaths.get(shape.id) ?? decodePolyline(shape.polyline);
      decodedPaths.set(shape.id, path);
      if (path.length < 2) continue;

      L.polyline(path, {
        pane: 'routes',
        color: lineColor(shape.lineKey),
        weight: 4,
        opacity: 0.9,
        // Dashed, because this is a preview of something not currently switched on
        // rather than part of the view.
        dashArray: DASH_PREVIEW,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(layer);
    }
  }, [hotLineKey, hotRouteId, shapes, showRoutes, zoom, alwaysShowRoutes, activeLines]);

  // Stations are fetched once and only rebuilt when the filter or the toggle
  // changes, never on a vehicle poll.
  useEffect(() => {
    const layer = stationLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showStations || !stations) return;

    for (const station of stations) {
      // Bus stops carry no lines of their own, so they arrive without the field
      // and render neutral. A rail station with no resolvable line still shows.
      const keys = station.lineKeys ?? [];
      if (keys.length && !keys.some((key) => activeLines.has(key))) continue;

      const marker = L.circleMarker([station.latitude, station.longitude], {
        radius: 4,
        weight: 2,
        color: lineColor(keys[0]),
        fillColor: '#ffffff',
        fillOpacity: 1,
      }).bindPopup(stationPopup(station));

      if (stationLabels) {
        // Bound once and shown or hidden in CSS by zoom, rather than rebuilding
        // every marker each time the zoom changes.
        marker.bindTooltip(station.name, {
          permanent: true,
          direction: 'right',
          offset: [7, 0],
          className: 'station-label',
          // Leaflet writes this straight onto the element's style attribute, and
          // it defaults to 0.9. Setting it to 1 keeps a map label crisp.
          opacity: 1,
        });
      }

      marker.addTo(layer);
    }
  }, [stations, activeLines, showStations, stationLabels]);

  const labelsVisible = stationLabels && zoom >= STATION_LABEL_MIN_ZOOM;

  return (
    <div
      ref={containerRef}
      className={`map ${labelsVisible ? 'is-labeled' : ''}`}
      aria-label="Map of live MBTA train positions"
    />
  );
}
