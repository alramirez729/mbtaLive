import { useCallback, useMemo, useState } from 'react';
import MapView from '../components/MapView';
import Panel from '../components/Panel';
import FilterPanel from '../components/FilterPanel';
import AlertsPanel from '../components/AlertsPanel';
import { usePolledResource } from '../hooks/usePolledResource';
import ModeNav from '../components/ModeNav';
import HelpPanel from '../components/HelpPanel';
import { fetchAlerts, fetchShapes, fetchStations, fetchVehicles } from '../api/mbta';
import { RAIL_LINES, RAIL_LINE_KEYS } from '../lib/lines';

// Individual vehicle records refresh roughly every 18 seconds upstream, so most
// polls return identical data and polling faster mainly shortens the wait for the
// ones that did change. Alerts change on the order of minutes. Station and track
// geometry are static, so they are fetched once per page load with no interval.
const VEHICLE_INTERVAL_MS = 5000;
const ALERT_INTERVAL_MS = 60000;

// A first visit opens focused on one line with the filters showing, rather than on
// the whole network with everything closed. Six lines and 110 trains at once does
// not explain itself; one line, framed, next to the control that did it does.
// Blue is the pick because it is the shortest and simplest line, so the framing
// reads clearly and nothing overlaps.
const INTRO_LINE = 'Blue';

function formatClock(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SubwayPage() {
  const [activeLines, setActiveLines] = useState(() => new Set([INTRO_LINE]));
  // Which line is isolated, and a counter so clicking the same line again
  // re-frames it rather than doing nothing.
  const [focus, setFocus] = useState({ lineKey: INTRO_LINE, nonce: 1 });
  const [layers, setLayers] = useState({
    showRoutes: true,
    showStations: true,
    showMotion: true,
  });
  // Only one panel at a time: two open cards would cover most of a phone screen,
  // and on desktop the second would sit on top of the first.
  const [openPanel, setOpenPanel] = useState('filters');
  // Which line the pointer is over in the filter list.
  const [hoveredLine, setHoveredLine] = useState(null);

  const vehicles = usePolledResource(fetchVehicles, VEHICLE_INTERVAL_MS);
  const alerts = usePolledResource(fetchAlerts, ALERT_INTERVAL_MS);
  const stations = usePolledResource(fetchStations);
  const shapes = usePolledResource(fetchShapes);

  const toggleLine = useCallback((lineKey) => {
    // Hand-picking lines means the view is no longer "focused on" any one of them.
    setFocus({ lineKey: null, nonce: 0 });
    setActiveLines((previous) => {
      // A new Set each time, because the map effects key off identity.
      const next = new Set(previous);
      if (next.has(lineKey)) next.delete(lineKey);
      else next.add(lineKey);
      return next;
    });
  }, []);

  // Isolate one line and frame the whole of it, the way picking a bus route does.
  const focusLine = useCallback((lineKey) => {
    setActiveLines(new Set([lineKey]));
    setFocus((previous) => ({ lineKey, nonce: previous.nonce + 1 }));
  }, []);

  const setAllLines = useCallback((enabled) => {
    setFocus({ lineKey: null, nonce: 0 });
    setActiveLines(enabled ? new Set(RAIL_LINE_KEYS) : new Set());
  }, []);

  const setLayer = useCallback((key, value) => {
    setLayers((previous) => ({ ...previous, [key]: value }));
  }, []);

  const setPanel = useCallback((name, open) => {
    setOpenPanel(open ? name : (current) => (current === name ? null : current));
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

  // Every station on the focused line, which is what the map frames itself to.
  const fitPoints = useMemo(() => {
    if (!focus.lineKey || !stations.data) return null;
    const points = stations.data
      .filter((station) => station.lineKeys?.includes(focus.lineKey))
      .map((station) => [station.latitude, station.longitude]);
    return points.length ? points : null;
    // nonce is in here so re-picking the same line re-frames it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.lineKey, focus.nonce, stations.data]);

  const lastUpdated = formatClock(vehicles.updatedAt);
  const isStale = Boolean(vehicles.error && vehicles.data);
  const hiddenLines = RAIL_LINE_KEYS.length - activeLines.size;

  return (
    <div className="app">
      <MapView
        vehicles={vehicles.data}
        stations={stations.data}
        shapes={shapes.data}
        activeLines={activeLines}
        showStations={layers.showStations}
        showRoutes={layers.showRoutes}
        showMotion={layers.showMotion}
        motionDurationMs={VEHICLE_INTERVAL_MS}
        stationLabels
        fitPoints={fitPoints}
        highlightLineKey={hoveredLine}
      />

      <div className="hud hud--top-left">
        <ModeNav />
        <div className="status">
          <span className={`pulse ${isStale ? 'pulse--stale' : ''}`} aria-hidden="true" />
          <span className="status__text">
            {vehicles.isLoading && !vehicles.data
              ? 'Connecting'
              : `${visibleVehicleCount} train${visibleVehicleCount === 1 ? '' : 's'}`}
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
            lines={RAIL_LINES}
            activeLines={activeLines}
            counts={counts}
            onToggle={toggleLine}
            onSetAll={setAllLines}
            onFocus={focusLine}
            focusedLine={focus.lineKey}
            onHover={setHoveredLine}
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

        <Panel
          label="Help"
          icon="?"
          iconOnly
          side="right"
          open={openPanel === 'help'}
          onOpenChange={(open) => setPanel('help', open)}
        >
          <HelpPanel mode="subway" />
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
