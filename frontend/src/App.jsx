import { Navigate, Route, Routes } from 'react-router-dom';
import SubwayPage from './pages/SubwayPage';
import BusPage from './pages/BusPage';

// Rail and bus are separate pages: bus needs a route directory and a drill-down,
// rail needs none of it, and one combined filter list served neither well.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/subway" replace />} />
      <Route path="/subway" element={<SubwayPage />} />
      <Route path="/bus" element={<BusPage />} />
      {/* Anything else lands on the map rather than a dead end. */}
      <Route path="*" element={<Navigate to="/subway" replace />} />
    </Routes>
  );
}
