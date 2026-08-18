import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { lineColor } from '../lib/lines';

const BOSTON_CENTER = [42.3601, -71.0589];
const DEFAULT_ZOOM = 12;

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

function vehicleIconHtml(vehicle) {
  const color = vehicle.color || lineColor(vehicle.lineKey);
  const hasBearing = typeof vehicle.bearing === 'number';
  const bearing = hasBearing ? vehicle.bearing : 0;
  const heading = hasBearing ? '<span class="vehicle__heading"></span>' : '';
  return `<div class="vehicle" style="--line-color:${esc(color)};--bearing:${bearing}deg">
    ${heading}
    <span class="vehicle__body">${esc(vehicle.badge ?? '')}</span>
  </div>`;
}

function vehicleIcon(vehicle) {
  return L.divIcon({
    className: 'vehicle-icon',
    html: vehicleIconHtml(vehicle),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function vehiclePopup(vehicle) {
  const color = vehicle.color || lineColor(vehicle.lineKey);
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

  return `<div class="popup">
    <p class="popup__title" style="--line-color:${esc(color)}">${esc(vehicle.routeName)}</p>
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

export default function MapView({ vehicles, stations, activeLines, showStations }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // One layer group per line, so toggling a line is a single add/remove of a
  // group rather than a rebuild of its markers.
  const vehicleLayersRef = useRef(new Map());
  const stationLayerRef = useRef(null);
  // id -> { marker, lineKey, bearing } so each refresh moves existing markers
  // instead of clearing and re-creating every marker on the map.
  const markersRef = useRef(new Map());

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

    stationLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      // Without this, a remount (StrictMode, hot reload) throws
      // "Map container is already initialized".
      map.remove();
      mapRef.current = null;
      vehicleLayersRef.current.clear();
      markersRef.current.clear();
      stationLayerRef.current = null;
    };
  }, []);

  // Keep vehicle markers in sync with the latest poll.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !vehicles) return;

    const markers = markersRef.current;
    const layers = vehicleLayersRef.current;

    const layerFor = (lineKey) => {
      let layer = layers.get(lineKey);
      if (!layer) {
        layer = L.layerGroup();
        layers.set(lineKey, layer);
        if (activeLines.has(lineKey)) layer.addTo(map);
      }
      return layer;
    };

    const seen = new Set();
    for (const vehicle of vehicles) {
      seen.add(vehicle.id);
      const existing = markers.get(vehicle.id);
      const position = [vehicle.latitude, vehicle.longitude];

      if (!existing) {
        const marker = L.marker(position, {
          icon: vehicleIcon(vehicle),
          keyboard: false,
          riseOnHover: true,
        }).bindPopup(vehiclePopup(vehicle));
        marker.addTo(layerFor(vehicle.lineKey));
        markers.set(vehicle.id, {
          marker,
          lineKey: vehicle.lineKey,
          bearing: vehicle.bearing,
        });
        continue;
      }

      existing.marker.setLatLng(position);

      if (existing.lineKey !== vehicle.lineKey) {
        // Green Line branch reassignments do happen mid-trip.
        layers.get(existing.lineKey)?.removeLayer(existing.marker);
        existing.marker.addTo(layerFor(vehicle.lineKey));
        existing.lineKey = vehicle.lineKey;
        existing.marker.setIcon(vehicleIcon(vehicle));
        existing.bearing = vehicle.bearing;
      } else if (existing.bearing !== vehicle.bearing) {
        // Nudging the CSS variable rotates the heading arrow without asking
        // Leaflet to rebuild the icon's DOM.
        const element = existing.marker.getElement()?.firstElementChild;
        if (element && typeof vehicle.bearing === 'number') {
          element.style.setProperty('--bearing', `${vehicle.bearing}deg`);
        } else {
          existing.marker.setIcon(vehicleIcon(vehicle));
        }
        existing.bearing = vehicle.bearing;
      }

      existing.marker.setPopupContent(vehiclePopup(vehicle));
    }

    // Drop vehicles that have gone out of service since the last poll.
    for (const [id, entry] of markers) {
      if (seen.has(id)) continue;
      layers.get(entry.lineKey)?.removeLayer(entry.marker);
      markers.delete(id);
    }
  }, [vehicles, activeLines]);

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

  // Stations are fetched once and only rebuilt when the filter or the toggle
  // changes, never on a vehicle poll.
  useEffect(() => {
    const layer = stationLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showStations || !stations) return;

    for (const station of stations) {
      const keys = station.lineKeys;
      // A station with no resolvable line still belongs on the map.
      if (keys.length && !keys.some((key) => activeLines.has(key))) continue;

      L.circleMarker([station.latitude, station.longitude], {
        radius: 4,
        weight: 2,
        color: lineColor(keys[0]),
        fillColor: '#ffffff',
        fillOpacity: 1,
      })
        .bindPopup(stationPopup(station))
        .addTo(layer);
    }
  }, [stations, activeLines, showStations]);

  return <div ref={containerRef} className="map" aria-label="Map of live MBTA train positions" />;
}
