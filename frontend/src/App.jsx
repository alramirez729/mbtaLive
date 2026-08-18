import { useCallback, useMemo, useState } from 'react';
import MapView from './components/MapView';
import Panel from './components/Panel';
import FilterPanel from './components/FilterPanel';
import AlertsPanel from './components/AlertsPanel';
import { usePolledResource } from './hooks/usePolledResource';
import {
  fetchAlerts,
  fetchBuses,
  fetchBusShapes,
  fetchShapes,
  fetchStations,
  fetchVehicles,
} from './api/mbta';
import { BUS_LINE_KEYS, DEFAULT_LINE_KEYS, LINE_KEYS } from './lib/lines';

// Individual vehicle records refresh roughly every 18 seconds upstream, so most
// polls return identical data and polling faster mainly shortens the wait for the
// ones that did change. Alerts change on the order of minutes. Station and track
// geometry are static, so they are fetched once per page load with no interval.
const VEHICLE_INTERVAL_MS = 5000;
const ALERT_INTERVAL_MS = 60000;

function formatClock(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  // Rail only on a first visit; bus is opt-in because it is several times the
  // fleet size and 176 more route shapes.
  const [activeLines, setActiveLines] = useState(() => new Set(DEFAULT_LINE_KEYS));
  const [layers, setLayers] = useState({
    showRoutes: true,
    showStations: true,
    showMotion: true,
  });
  // Only one panel at a time: two open cards would cover most of a phone screen,
  // and on desktop the second would sit on top of the first.
  const [openPanel, setOpenPanel] = useState(null);

  // Nothing bus-related is requested until a bus line is switched on.
  const busEnabled = useMemo(
    () => BUS_LINE_KEYS.some((key) => activeLines.has(key)),
    [activeLines],
  );

  const vehicles = usePolledResource(fetchVehicles, VEHICLE_INTERVAL_MS);
  const buses = usePolledResource(fetchBuses, VEHICLE_INTERVAL_MS, busEnabled);
  const alerts = usePolledResource(fetchAlerts, ALERT_INTERVAL_MS);
  const stations = usePolledResource(fetchStations);
  const shapes = usePolledResource(fetchShapes);
  const busShapes = usePolledResource(fetchBusShapes, 0, busEnabled);

  // The map takes one list of each; which feed a vehicle came from stops
  // mattering once it has a lineKey.
  const allVehicles = useMemo(() => {
    if (!buses.data) return vehicles.data;
    return [...(vehicles.data ?? []), ...buses.data];
  }, [vehicles.data, buses.data]);

  const allShapes = useMemo(() => {
    if (!busShapes.data) return shapes.data;
    return [...(shapes.data ?? []), ...busShapes.data];
  }, [shapes.data, busShapes.data]);

  const toggleLine = useCallback((lineKey) => {
    setActiveLines((previous) => {
      // A new Set each time, because the map effects key off identity.
      const next = new Set(previous);
      if (next.has(lineKey)) next.delete(lineKey);
      else next.add(lineKey);
      return next;
    });
  }, []);

  const setAllLines = useCallback((enabled) => {
    setActiveLines(enabled ? new Set(LINE_KEYS) : new Set());
  }, []);

  const setLayer = useCallback((key, value) => {
    setLayers((previous) => ({ ...previous, [key]: value }));
  }, []);

  const setPanel = useCallback((name, open) => {
    setOpenPanel(open ? name : (current) => (current === name ? null : current));
  }, []);

  const counts = useMemo(() => {
    const tally = new Map();
    for (const vehicle of allVehicles ?? []) {
      tally.set(vehicle.lineKey, (tally.get(vehicle.lineKey) ?? 0) + 1);
    }
    return tally;
  }, [allVehicles]);

  const visibleVehicleCount = useMemo(() => {
    let total = 0;
    for (const [lineKey, count] of counts) {
      if (activeLines.has(lineKey)) total += count;
    }
    return total;
  }, [counts, activeLines]);

  const alertCount = useMemo(() => {
    if (!alerts.data) return 0;
    return alerts.data.filter(
      (alert) => !alert.lineKeys.length || alert.lineKeys.some((key) => activeLines.has(key)),
    ).length;
  }, [alerts.data, activeLines]);

  const lastUpdated = formatClock(vehicles.updatedAt);
  const isStale = Boolean(vehicles.error && vehicles.data);
  const hiddenLines = LINE_KEYS.length - activeLines.size;

  return (
    <div className="app">
      <MapView
        vehicles={allVehicles}
        stations={stations.data}
        shapes={allShapes}
        activeLines={activeLines}
        showStations={layers.showStations}
        showRoutes={layers.showRoutes}
        showMotion={layers.showMotion}
        motionDurationMs={VEHICLE_INTERVAL_MS}
      />

      <div className="hud hud--top-left">
        <div className="status">
          <span className={`pulse ${isStale ? 'pulse--stale' : ''}`} aria-hidden="true" />
          <span className="status__text">
            {vehicles.isLoading && !vehicles.data
              ? 'Connecting'
              : // "trains" is wrong once buses are on the map.
                `${visibleVehicleCount} ${busEnabled ? 'vehicle' : 'train'}${
                  visibleVehicleCount === 1 ? '' : 's'
                }`}
          </span>
          {lastUpdated && <span className="status__time">{lastUpdated}</span>}
        </div>
      </div>

      <div className="hud hud--controls">
        <Panel
          label="Filters"
          icon="☰"
          side="right"
          badge={hiddenLines}
          badgeTitle={`${hiddenLines} line${hiddenLines === 1 ? '' : 's'} hidden`}
          open={openPanel === 'filters'}
          onOpenChange={(open) => setPanel('filters', open)}
        >
          <FilterPanel
            activeLines={activeLines}
            counts={counts}
            onToggle={toggleLine}
            onSetAll={setAllLines}
            layers={layers}
            onLayerChange={setLayer}
          />
        </Panel>

        <Panel
          label="Alerts"
          icon="!"
          side="right"
          badge={alertCount}
          badgeTitle={`${alertCount} active alert${alertCount === 1 ? '' : 's'}`}
          open={openPanel === 'alerts'}
          onOpenChange={(open) => setPanel('alerts', open)}
        >
          <AlertsPanel
            alerts={alerts.data}
            isLoading={alerts.isLoading}
            error={alerts.error}
            activeLines={activeLines}
          />
        </Panel>
      </div>

      {isStale && (
        <p className="banner" role="status">
          Live feed interrupted, showing the last known positions. Retrying automatically.
        </p>
      )}

      {vehicles.error && !vehicles.data && (
        <p className="banner banner--error" role="alert">
          Could not reach the MBTA feed. {vehicles.error.message}
        </p>
      )}
    </div>
  );
}
