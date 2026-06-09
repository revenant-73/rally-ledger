import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Roster from './pages/Roster';
import History from './pages/History';
import Settings from './pages/Settings';
import NewMatch from './pages/NewMatch';
import LiveMatch from './pages/LiveMatch';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="roster" element={<Roster />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* These screens will likely be full-screen without the bottom nav */}
        <Route path="match/new" element={<NewMatch />} />
        <Route path="match/live" element={<LiveMatch />} />
        <Route path="match/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
