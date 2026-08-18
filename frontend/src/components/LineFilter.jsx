import { LINES } from '../lib/lines';

export default function LineFilter({ activeLines, counts, onToggle, onSetAll }) {
  const allActive = activeLines.size === LINES.length;

  return (
    <div className="filter" role="group" aria-label="Filter trains by line">
      {LINES.map((line) => {
        const isActive = activeLines.has(line.key);
        const count = counts.get(line.key) ?? 0;
        return (
          <button
            key={line.key}
            type="button"
            className="chip"
            style={{ '--line-color': line.color }}
            aria-pressed={isActive}
            onClick={() => onToggle(line.key)}
            title={`${line.label}: ${count} train${count === 1 ? '' : 's'} running`}
          >
            <span className="chip__dot" aria-hidden="true" />
            <span className="chip__label">{line.label}</span>
            <span className="chip__count">{count}</span>
          </button>
        );
      })}
      <button
        type="button"
        className="chip chip--action"
        onClick={() => onSetAll(!allActive)}
      >
        {allActive ? 'Clear all' : 'Select all'}
      </button>
    </div>
  );
}
