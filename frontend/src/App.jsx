import { useCallback, useMemo, useState } from 'react';
import MapView from './components/MapView';
import LineFilter from './components/LineFilter';
import AlertsPanel from './components/AlertsPanel';
import { usePolledResource } from './hooks/usePolledResource';
import { fetchAlerts, fetchShapes, fetchStations, fetchVehicles } from './api/mbta';
import { LINE_KEYS } from './lib/lines';

// Individual vehicle records refresh roughly every 18 seconds upstream, so most
// polls return identical data and polling faster mainly shortens the wait for the
// ones that did change. Alerts change on the order of minutes. Station and track
// geometry are static, so they are fetched once per page load with no interval.
const VEHICLE_INTERVAL_MS = 5000;
const ALERT_INTERVAL_MS = 60000;

function formatClock(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function App() {
  const [activeLines, setActiveLines] = useState(() => new Set(LINE_KEYS));
  const [showStations, setShowStations] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showMotion, setShowMotion] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const vehicles = usePolledResource(fetchVehicles, VEHICLE_INTERVAL_MS);
  const alerts = usePolledResource(fetchAlerts, ALERT_INTERVAL_MS);
  const stations = usePolledResource(fetchStations);
  const shapes = usePolledResource(fetchShapes);

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

  const counts = useMemo(() => {
    const tally = new Map();
    for (const vehicle of vehicles.data ?? []) {
      tally.set(vehicle.lineKey, (tally.get(vehicle.lineKey) ?? 0) + 1);
    }
    return tally;
  }, [vehicles.data]);

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

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1 className="topbar__title">MBTA Live</h1>
          <p className="topbar__status">
            <span className={`pulse ${isStale ? 'pulse--stale' : ''}`} aria-hidden="true" />
            {vehicles.isLoading && !vehicles.data
              ? 'Connecting'
              : `${visibleVehicleCount} train${visibleVehicleCount === 1 ? '' : 's'}`}
            {lastUpdated && <span className="topbar__time">as of {lastUpdated}</span>}
          </p>
        </div>

        <LineFilter
          activeLines={activeLines}
          counts={counts}
          onToggle={toggleLine}
          onSetAll={setAllLines}
        />

        <div className="topbar__actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(event) => setShowRoutes(event.target.checked)}
            />
            <span>Routes</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showStations}
              onChange={(event) => setShowStations(event.target.checked)}
            />
            <span>Stations</span>
          </label>
          <label className="toggle" title="Glide trains along the track between updates">
            <input
              type="checkbox"
              checked={showMotion}
              onChange={(event) => setShowMotion(event.target.checked)}
            />
            <span>Motion</span>
          </label>
          <button
            type="button"
            className="button"
            aria-expanded={alertsOpen}
            onClick={() => setAlertsOpen((open) => !open)}
          >
            Alerts
            {alertCount > 0 && <span className="button__badge">{alertCount}</span>}
          </button>
        </div>
      </header>

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

      <main className="stage">
        <MapView
          vehicles={vehicles.data}
          stations={stations.data}
          shapes={shapes.data}
          activeLines={activeLines}
          showStations={showStations}
          showRoutes={showRoutes}
          showMotion={showMotion}
          motionDurationMs={VEHICLE_INTERVAL_MS}
        />
        {alertsOpen && (
          <AlertsPanel
            alerts={alerts.data}
            isLoading={alerts.isLoading}
            error={alerts.error}
            activeLines={activeLines}
            onClose={() => setAlertsOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
