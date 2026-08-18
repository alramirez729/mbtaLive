import { useMemo, useState } from 'react';
import { lineColor, lineLabel } from '../lib/lines';

// MBTA publishes severity as 1-10. These are the buckets riders actually care
// about, and the lower bound of each is what the filter compares against.
const SEVERITY_TIERS = [
  { key: 'all', label: 'All severities', min: 0 },
  { key: 'moderate', label: 'Moderate and up', min: 4 },
  { key: 'severe', label: 'Severe only', min: 7 },
];

function severityTier(severity) {
  if (severity >= 7) return { label: 'Severe', className: 'sev sev--high' };
  if (severity >= 4) return { label: 'Moderate', className: 'sev sev--mid' };
  return { label: 'Minor', className: 'sev sev--low' };
}

function formatEffect(effect) {
  if (!effect) return null;
  return effect.toLowerCase().replace(/_/g, ' ');
}

export default function AlertsPanel({ alerts, isLoading, error, activeLines, onClose }) {
  const [tierKey, setTierKey] = useState('all');
  const minSeverity = SEVERITY_TIERS.find((tier) => tier.key === tierKey)?.min ?? 0;

  const visible = useMemo(() => {
    if (!alerts) return [];
    return alerts
      .filter((alert) => alert.severity >= minSeverity)
      // An alert with no resolvable line is system-wide, so it always shows.
      .filter((alert) => !alert.lineKeys.length || alert.lineKeys.some((key) => activeLines.has(key)))
      // Most disruptive first; the point of the panel is the bad news.
      .sort((a, b) => b.severity - a.severity);
  }, [alerts, minSeverity, activeLines]);

  return (
    <aside className="alerts" aria-label="MBTA service alerts">
      <header className="alerts__head">
        <h2 className="alerts__title">Service alerts</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close alerts">
          &times;
        </button>
      </header>

      <div className="alerts__controls">
        <label className="field">
          <span className="field__label">Severity</span>
          <select value={tierKey} onChange={(event) => setTierKey(event.target.value)}>
            {SEVERITY_TIERS.map((tier) => (
              <option key={tier.key} value={tier.key}>
                {tier.label}
              </option>
            ))}
          </select>
        </label>
        <p className="alerts__hint">Alerts follow the line filter above.</p>
      </div>

      <div className="alerts__list">
        {isLoading && <p className="alerts__empty">Loading alerts...</p>}

        {error && !alerts && (
          <p className="alerts__empty alerts__empty--error">Could not load alerts. {error.message}</p>
        )}

        {alerts && visible.length === 0 && (
          <p className="alerts__empty">No alerts match the current filters. Service looks normal.</p>
        )}

        {visible.map((alert) => {
          const tier = severityTier(alert.severity);
          const effect = formatEffect(alert.effect);
          return (
            <article
              key={alert.id}
              className="alert"
              style={{ '--line-color': lineColor(alert.lineKeys[0]) }}
            >
              <div className="alert__meta">
                <span className={tier.className}>{tier.label}</span>
                {effect && <span className="alert__effect">{effect}</span>}
              </div>
              <h3 className="alert__header">{alert.header}</h3>
              {alert.description && <p className="alert__body">{alert.description}</p>}
              {alert.lineKeys.length > 0 && (
                <ul className="alert__lines">
                  {alert.lineKeys.map((key) => (
                    <li key={key} style={{ '--line-color': lineColor(key) }}>
                      {lineLabel(key)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
