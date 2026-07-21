import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Roster from './pages/Roster';
import History from './pages/History';
import MatchDetail from './pages/MatchDetail';
import Settings from './pages/Settings';
import NewMatch from './pages/NewMatch';
import LiveMatch from './pages/LiveMatch';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          className: 'font-bold rounded-2xl bg-brand-bg text-brand-text border border-brand-gray/20',
          duration: 2000,
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          <Route path="roster" element={<Roster />} />
          <Route path="history" element={<History />} />
          <Route path="match/history/:matchId" element={<MatchDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* These screens will likely be full-screen without the bottom nav */}
        <Route path="match/new" element={
          <ProtectedRoute>
            <NewMatch />
          </ProtectedRoute>
        } />
        <Route path="match/live" element={
          <ProtectedRoute>
            <LiveMatch />
          </ProtectedRoute>
        } />
        <Route path="match/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
