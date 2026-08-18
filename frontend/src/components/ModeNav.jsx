import { NavLink } from 'react-router-dom';

const MODES = [
  { to: '/subway', label: 'Subway' },
  { to: '/bus', label: 'Bus' },
];

/** Switches between the rail and bus maps. */
export default function ModeNav() {
  return (
    <nav className="modenav" aria-label="Choose a network">
      {MODES.map((mode) => (
        <NavLink
          key={mode.to}
          to={mode.to}
          className={({ isActive }) => `modenav__item ${isActive ? 'is-active' : ''}`}
        >
          {mode.label}
        </NavLink>
      ))}
    </nav>
  );
}
