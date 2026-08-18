import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView';
import Panel from '../components/Panel';
import AlertsPanel from '../components/AlertsPanel';
import BusRoutePanel from '../components/BusRoutePanel';
import ModeNav from '../components/ModeNav';
import { usePolledResource } from '../hooks/usePolledResource';
import {
  fetchAlerts,
  fetchBusRoutes,
  fetchBusShapes,
  fetchBusStops,
  fetchBuses,
} from '../api/mbta';
import { BUS_LINE_KEYS } from '../lib/lines';

const VEHICLE_INTERVAL_MS = 5000;
const ALERT_INTERVAL_MS = 60000;

// Every bus is on the map, so both bus lines are always live here. The page is
// the opt-in.
const BUS_LINES_ACTIVE = new Set(BUS_LINE_KEYS);

function formatClock(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BusPage() {
  // The selected route lives in the URL, so a particular route is linkable and
  // the back button steps out of it.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('route');
  const [activeDirection, setActiveDirection] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);

  const buses = usePolledResource(fetchBuses, VEHICLE_INTERVAL_MS);
  const alerts = usePolledResource(fetchAlerts, ALERT_INTERVAL_MS);
  const routes = usePolledResource(fetchBusRoutes);
  const shapes = usePolledResource(fetchBusShapes);

  // Stops are only fetched for the route in view.
  const stopsFetcher = useCallback(
    (signal) => (selectedId ? fetchBusStops(selectedId, signal) : Promise.resolve(null)),
    [selectedId],
  );
  const stops = usePolledResource(stopsFetcher, 0, Boolean(selectedId));

  const selectedRoute = useMemo(
    () => routes.data?.find((route) => route.id === selectedId) ?? null,
    [routes.data, selectedId],
  );

  // Tag the stops with the route's line so they render in its colour rather than
  // as anonymous grey dots.
  const routeStops = useMemo(() => {
    if (!selectedId || !stops.data || !selectedRoute) return null;
    return stops.data.map((stop) => ({ ...stop, lineKeys: [selectedRoute.lineKey] }));
  }, [stops.data, selectedId, selectedRoute]);

  // Frame the route when the selection changes, not on every stop refresh.
  const fitPoints = useMemo(() => {
    if (!routeStops) return null;
    return routeStops.map((stop) => [stop.latitude, stop.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, Boolean(routeStops)]);

  const selectRoute = useCallback(
    (routeId) => {
      setActiveDirection(null);
      setSearchParams(routeId ? { route: routeId } : {}, { replace: false });
    },
    [setSearchParams],
  );

  // Buses on the selected route, honouring the direction filter. With no route
  // selected the whole fleet shows as an overview.
  const visibleBuses = useMemo(() => {
    if (!buses.data) return null;
    if (!selectedId) return buses.data;
    return buses.data.filter(
      (bus) =>
        bus.routeId === selectedId &&
        (activeDirection === null || bus.directionId === activeDirection),
    );
  }, [buses.data, selectedId, activeDirection]);

  // Live count per direction, for the detail panel.
  const directionCounts = useMemo(() => {
    const tally = {};
    for (const bus of buses.data ?? []) {
      if (selectedId && bus.routeId !== selectedId) continue;
      if (bus.directionId === null) continue;
      tally[bus.directionId] = (tally[bus.directionId] ?? 0) + 1;
    }
    return tally;
  }, [buses.data, selectedId]);

  // Geometry: the selected route on its own, or in the overview the whole network,
  // which MapView then gates on zoom. 176 shapes at once is an unreadable web at
  // region scale but useful once you are down at neighbourhood level.
  const visibleShapes = useMemo(() => {
    if (!shapes.data) return null;
    if (!selectedId) return shapes.data;
    return shapes.data.filter((shape) => shape.routeId === selectedId);
  }, [shapes.data, selectedId]);

  const setPanel = useCallback((name, open) => {
    setOpenPanel(open ? name : (current) => (current === name ? null : current));
  }, []);

  const alertCount = useMemo(() => {
    if (!alerts.data) return 0;
    return alerts.data.filter((alert) =>
      selectedRoute
        ? alert.lineKeys.includes(selectedRoute.lineKey)
        : alert.lineKeys.some((key) => BUS_LINES_ACTIVE.has(key)),
    ).length;
  }, [alerts.data, selectedRoute]);

  const lastUpdated = formatClock(buses.updatedAt);
  const isStale = Boolean(buses.error && buses.data);
  const busCount = visibleBuses?.length ?? 0;

  return (
    <div className="app">
      <MapView
        vehicles={visibleBuses}
        // The selected route's stops, drawn with the station layer.
        stations={routeStops}
        shapes={visibleShapes}
        activeLines={BUS_LINES_ACTIVE}
        showStations
        showRoutes
        showMotion
        motionDurationMs={VEHICLE_INTERVAL_MS}
        // A single chosen route is the subject, so it draws at any zoom. The
        // overview stays gated, appearing only once you zoom in far enough for it
        // to be readable.
        alwaysShowRoutes={Boolean(selectedId)}
        fitPoints={fitPoints}
      />

      <div className="hud hud--top-left">
        <ModeNav />
        <div className="status">
          <span className={`pulse ${isStale ? 'pulse--stale' : ''}`} aria-hidden="true" />
          <span className="status__text">
            {buses.isLoading && !buses.data
              ? 'Connecting'
              : `${busCount} bus${busCount === 1 ? '' : 'es'}`}
          </span>
          {selectedRoute && <span className="status__time">route {selectedRoute.shortName}</span>}
          {!selectedRoute && lastUpdated && <span className="status__time">{lastUpdated}</span>}
        </div>
      </div>

      <div className="hud hud--controls">
        <Panel
          label="Routes"
          icon="☰"
          side="right"
          badge={selectedRoute ? 0 : routes.data?.length ?? 0}
          badgeTitle={`${routes.data?.length ?? 0} bus routes`}
          open={openPanel === 'routes'}
          onOpenChange={(open) => setPanel('routes', open)}
        >
          <BusRoutePanel
            routes={routes.data}
            isLoading={routes.isLoading}
            error={routes.error}
            selectedRoute={selectedRoute}
            onSelect={selectRoute}
            directionCounts={directionCounts}
            activeDirection={activeDirection}
            onDirectionChange={setActiveDirection}
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
            activeLines={selectedRoute ? new Set([selectedRoute.lineKey]) : BUS_LINES_ACTIVE}
          />
        </Panel>
      </div>

      {!selectedId && routes.data && (
        <p className="banner banner--hint" role="status">
          Showing every bus. Open Routes to pick one and see its direction, stops, and connections.
        </p>
      )}

      {isStale && (
        <p className="banner" role="status">
          Live feed interrupted, showing the last known positions. Retrying automatically.
        </p>
      )}
    </div>
  );
}
