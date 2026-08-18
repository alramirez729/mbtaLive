import { useMemo, useState } from 'react';
import { lineColor, lineLabel } from '../lib/lines';

/**
 * The bus panel: a searchable directory of all 149 routes, and once one is picked,
 * its detail. 149 routes is too many to scan, so search is the primary way in.
 */
export default function BusRoutePanel({
  routes,
  isLoading,
  error,
  selectedRoute,
  onSelect,
  directionCounts,
  activeDirection,
  onDirectionChange,
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    if (!routes) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return routes;
    return routes.filter(
      (route) =>
        route.shortName.toLowerCase().startsWith(needle) ||
        route.longName.toLowerCase().includes(needle) ||
        route.municipalities.some((town) => town.toLowerCase().includes(needle)),
    );
  }, [routes, query]);

  if (selectedRoute) {
    return (
      <div className="busroute">
        <button type="button" className="link-button busroute__back" onClick={() => onSelect(null)}>
          &larr; All routes
        </button>

        <div className="busroute__title">
          <span className="busroute__badge" style={{ '--line-color': lineColor(selectedRoute.lineKey) }}>
            {selectedRoute.shortName}
          </span>
          <span className="busroute__name">{selectedRoute.longName}</span>
        </div>

        <div className="filters__section">
          <div className="filters__heading">
            <span>Direction</span>
            {activeDirection !== null && (
              <button type="button" className="link-button" onClick={() => onDirectionChange(null)}>
                Show both
              </button>
            )}
          </div>
          <ul className="switches">
            {selectedRoute.directionNames.map((name, directionId) => (
              <li key={directionId}>
                <button
                  type="button"
                  className="line"
                  style={{ '--line-color': lineColor(selectedRoute.lineKey) }}
                  aria-pressed={activeDirection === null || activeDirection === directionId}
                  onClick={() =>
                    onDirectionChange(activeDirection === directionId ? null : directionId)
                  }
                >
                  <span className="line__dot" aria-hidden="true" />
                  <span className="line__name">
                    {name}
                    <span className="busroute__toward">
                      to {selectedRoute.directionDestinations[directionId] ?? 'unknown'}
                    </span>
                  </span>
                  <span className="line__count">{directionCounts[directionId] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selectedRoute.connections.length > 0 && (
          <div className="filters__section">
            <div className="filters__heading">
              <span>Connects to</span>
            </div>
            <ul className="connections">
              {selectedRoute.connections.map((connection) => (
                <li key={connection.lineKey} style={{ '--line-color': lineColor(connection.lineKey) }}>
                  <span className="connections__line">{lineLabel(connection.lineKey)}</span>
                  <span className="connections__stations">{connection.stations.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="filters__section">
          <div className="filters__heading">
            <span>Serves</span>
          </div>
          <p className="busroute__towns">{selectedRoute.municipalities.join(', ') || 'Unknown'}</p>
          <p className="busroute__meta">{selectedRoute.stopCount} stops</p>
        </div>
      </div>
    );
  }

  return (
    <div className="busroute">
      <div className="busroute__search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Route number, name, or town"
          aria-label="Search bus routes"
        />
      </div>

      {isLoading && !routes && <p className="alerts__empty">Loading routes...</p>}
      {error && !routes && (
        <p className="alerts__empty alerts__empty--error">Could not load routes. {error.message}</p>
      )}
      {routes && matches.length === 0 && <p className="alerts__empty">No routes match "{query}".</p>}

      <ul className="routelist">
        {matches.map((route) => (
          <li key={route.id}>
            <button type="button" className="routelist__item" onClick={() => onSelect(route.id)}>
              <span
                className="busroute__badge"
                style={{ '--line-color': lineColor(route.lineKey) }}
              >
                {route.shortName}
              </span>
              <span className="routelist__text">
                <span className="routelist__name">{route.longName}</span>
                <span className="routelist__towns">{route.municipalities.join(', ')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
