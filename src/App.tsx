import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';

const Home = lazy(() => import('./pages/Home'));
const Roster = lazy(() => import('./pages/Roster'));
const History = lazy(() => import('./pages/History'));
const MatchDetail = lazy(() => import('./pages/MatchDetail'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const NewMatch = lazy(() => import('./pages/NewMatch'));
const LiveMatch = lazy(() => import('./pages/LiveMatch'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const RebuildPrototype = lazy(() => import('./pages/RebuildPrototype'));

const LoadingScreen = () => (
  <div className="min-h-screen bg-brand-bg flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
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
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RebuildPrototype />} />
          <Route path="/prototype" element={<Navigate to="/" replace />} />

          <Route path="/app" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Home />} />
            <Route path="roster" element={<Roster />} />
            <Route path="history" element={<History />} />
            <Route path="match/history/:matchId" element={<MatchDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* These screens will likely be full-screen without the bottom nav */}
          <Route path="/app/match/new" element={
            <ProtectedRoute>
              <NewMatch />
            </ProtectedRoute>
          } />
          <Route path="/app/match/live" element={
            <ProtectedRoute>
              <LiveMatch />
            </ProtectedRoute>
          } />
          <Route path="/app/match/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
