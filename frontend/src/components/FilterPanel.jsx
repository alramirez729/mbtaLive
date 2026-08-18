/**
 * Contents of the Filters panel: which lines to show, plus the map layer
 * switches. The layers used to sit in the top bar, which no longer exists.
 */
export default function FilterPanel({
  lines,
  activeLines,
  counts,
  onToggle,
  onSetAll,
  layers,
  onLayerChange,
}) {
  const allActive = lines.every((line) => activeLines.has(line.key));

  return (
    <div className="filters">
      <div className="filters__section">
        <div className="filters__heading">
          <span>Lines</span>
          <button type="button" className="link-button" onClick={() => onSetAll(!allActive)}>
            {allActive ? 'Clear all' : 'Select all'}
          </button>
        </div>

        <ul className="lines">
          {lines.map((line) => {
            const isActive = activeLines.has(line.key);
            const count = counts.get(line.key) ?? 0;
            return (
              <li key={line.key}>
                <button
                  type="button"
                  className="line"
                  style={{ '--line-color': line.color }}
                  aria-pressed={isActive}
                  onClick={() => onToggle(line.key)}
                >
                  <span className="line__dot" aria-hidden="true" />
                  <span className="line__name">{line.label}</span>
                  <span className="line__count">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="filters__section">
        <div className="filters__heading">
          <span>Map layers</span>
        </div>
        <ul className="switches">
          {[
            { key: 'showRoutes', label: 'Route lines', hint: 'Draw the track for each line' },
            { key: 'showStations', label: 'Stations', hint: 'Show station markers' },
            {
              key: 'showMotion',
              label: 'Smooth motion',
              hint: 'Glide trains along the track between updates',
            },
          ].map((item) => (
            <li key={item.key}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={layers[item.key]}
                  onChange={(event) => onLayerChange(item.key, event.target.checked)}
                />
                <span className="switch__text">
                  <span className="switch__label">{item.label}</span>
                  <span className="switch__hint">{item.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
