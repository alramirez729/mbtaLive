/**
 * How to use the map. Content is page-aware, because the two pages are driven
 * differently: rail by picking a line, bus by picking a route.
 */

const SUBWAY_STEPS = [
  {
    title: 'Focus one line',
    body: 'Click a line in Filters to isolate it and zoom to its full length. Click another to switch, or "All lines" to see the whole network.',
  },
  {
    title: 'Compare lines',
    body: 'Use the checkbox beside a line to show or hide it without moving the map. Tick several to see them together.',
  },
  {
    title: 'Zoom in for names',
    body: 'Station names appear beside their dots once you zoom in far enough to read them.',
  },
];

const BUS_STEPS = [
  {
    title: 'Find a route',
    body: 'Open Routes and search by number, name, or town. "66", "Harvard", and "Chelsea" all work.',
  },
  {
    title: 'Follow one route',
    body: 'Pick a route to see its path, stops, live buses, which towns it serves, and the subway lines it connects to. The map frames the whole route.',
  },
  {
    title: 'Split by direction',
    body: 'Each direction lists how many buses are running. Click one to show only those.',
  },
  {
    title: 'Zoom in for the network',
    body: 'With no route picked, zoom in and every nearby bus route appears behind the buses.',
  },
];

const SHARED_STEPS = [
  {
    title: 'Switch networks',
    body: 'Subway and Bus at the top left are separate maps. Each keeps its own filters.',
  },
  {
    title: 'Tap anything',
    body: 'Vehicles, stations, and route lines all open a popup. A vehicle shows its line, where it is, and where it is heading.',
  },
  {
    title: 'Which way it is going',
    body: 'The small arrow on each vehicle points the way it is travelling along the track.',
  },
  {
    title: 'Alerts',
    body: 'Alerts follow whatever you have filtered, so you only see the ones that apply to what is on screen.',
  },
  {
    title: 'Live data',
    body: 'Positions refresh every few seconds and vehicles glide between updates. Turn off "Smooth motion" in Filters if you would rather they jump straight to each reported position.',
  },
];

export default function HelpPanel({ mode }) {
  const steps = mode === 'bus' ? BUS_STEPS : SUBWAY_STEPS;
  const heading = mode === 'bus' ? 'On the bus map' : 'On the subway map';

  return (
    <div className="help">
      <section className="filters__section">
        <div className="filters__heading">
          <span>{heading}</span>
        </div>
        <dl className="help__list">
          {steps.map((step) => (
            <div key={step.title} className="help__item">
              <dt>{step.title}</dt>
              <dd>{step.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="filters__section">
        <div className="filters__heading">
          <span>Everywhere</span>
        </div>
        <dl className="help__list">
          {SHARED_STEPS.map((step) => (
            <div key={step.title} className="help__item">
              <dt>{step.title}</dt>
              <dd>{step.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="filters__section">
        <p className="help__note">
          Live data from the{' '}
          <a href="https://www.mbta.com/developers/v3-api" target="_blank" rel="noreferrer">
            MBTA v3 API
          </a>
          . Positions are as reported by the MBTA and can lag real life by a few seconds.
        </p>
      </section>
    </div>
  );
}
