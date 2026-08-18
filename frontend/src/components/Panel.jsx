import { useEffect, useId, useRef, useState } from 'react';
import { COMPACT_QUERY, HOVER_QUERY, useMediaQuery } from '../hooks/useMediaQuery';

// Drag further than this and releasing dismisses the sheet instead of snapping
// it back open.
const DISMISS_DRAG_PX = 90;

/**
 * One collapsible control that renders as a floating card on desktop and a
 * drag-to-expand bottom sheet on a small screen.
 *
 * Desktop opens on hover, because that is the cheapest way to peek at it, but
 * hover alone is not enough: a click pins it open so the pointer can leave, and
 * touch devices never get a hover event at all. `HOVER_QUERY` is what decides
 * whether hover is wired up, rather than assuming small means touch.
 */
export default function Panel({
  label,
  badge,
  badgeTitle,
  icon,
  side = 'right',
  open,
  onOpenChange,
  children,
}) {
  const compact = useMediaQuery(COMPACT_QUERY);
  const canHover = useMediaQuery(HOVER_QUERY);
  const panelId = useId();

  // Distinguishes "open because the pointer is here" from "open because it was
  // clicked", so moving the pointer away does not close a pinned panel.
  const [pinned, setPinned] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) setPinned(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  // A tap outside dismisses the sheet, which is the expected gesture on mobile.
  // On desktop the card is non-modal and stays until dismissed deliberately.
  useEffect(() => {
    if (!open || !compact) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, compact, onOpenChange]);

  const handlePointerDown = (event) => {
    if (!compact) return;
    dragRef.current = { startY: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    // Only downward drags do anything; pulling up should not stretch the sheet.
    setDragOffset(Math.max(0, event.clientY - dragRef.current.startY));
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (dragOffset > DISMISS_DRAG_PX) onOpenChange(false);
    setDragOffset(0);
  };

  const hoverProps =
    canHover && !compact
      ? {
          onPointerEnter: () => onOpenChange(true),
          onPointerLeave: () => {
            if (!pinned) onOpenChange(false);
          },
        }
      : {};

  return (
    <div
      ref={rootRef}
      className={`panel panel--${side} ${compact ? 'panel--sheet' : 'panel--card'} ${
        open ? 'is-open' : ''
      }`}
      {...hoverProps}
    >
      <button
        type="button"
        className="panel__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        title={badge > 0 && badgeTitle ? badgeTitle : undefined}
        onClick={() => {
          if (open && pinned) {
            onOpenChange(false);
          } else {
            onOpenChange(true);
            setPinned(true);
          }
        }}
      >
        {icon && (
          <span className="panel__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="panel__label">{label}</span>
        {badge > 0 && (
          // aria-hidden so the button is announced as "Filters" rather than
          // "Filters 2"; a bare number reads as noise. The title carries the
          // meaning for anyone who wants it.
          <span className="panel__badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          className="panel__body"
          id={panelId}
          role="group"
          aria-label={label}
          style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
        >
          {compact && (
            <div
              className="panel__grip"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <span className="panel__grip-bar" aria-hidden="true" />
            </div>
          )}
          <div className="panel__head">
            <h2 className="panel__title">{label}</h2>
            <button
              type="button"
              className="icon-button"
              onClick={() => onOpenChange(false)}
              aria-label={`Close ${label}`}
            >
              &times;
            </button>
          </div>
          <div className="panel__content">{children}</div>
        </div>
      )}
    </div>
  );
}
