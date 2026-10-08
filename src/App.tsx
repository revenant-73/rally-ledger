import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { useAccess } from './hooks/queries/useAccess';
import { ApiError } from './utils/api';
import { readOfflineTeams } from './matchbook/offlineWorkspace';
import { useOnlineStatus } from './hooks/useOnlineStatus';

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
const CourtsideMatchbook = lazy(() => import('./pages/CourtsideMatchbook'));

const LoadingScreen = () => (
  <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4 text-brand-text">
    <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand-gray/20 border-b-brand-teal"></div>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-text-secondary">Loading Century Matchbook…</p>
  </div>
);

const AccessRequiredScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => (
  <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
    <section className="w-full max-w-md border border-white/15 bg-slate-900 p-6 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">Century Matchbook</p>
      <h1 className="mt-3 text-3xl font-black">Access Required</h1>
      <p className="mt-3 text-sm font-bold leading-relaxed text-slate-300">
        <span className="block text-white">{email}</span>
        Ask the program administrator to assign this account to a team before using rosters, lineups, or reports.
      </p>
      <button type="button" onClick={onSignOut} className="mt-6 min-h-12 w-full border border-white/20 bg-slate-800 px-4 font-black text-white focus:outline-none focus:ring-2 focus:ring-teal-300">
        Sign Out
      </button>
    </section>
  </main>
);

export const ProtectedRoute = ({ children, allowLocalScoring = false }: { children: ReactNode; allowLocalScoring?: boolean }) => {
  const { user, loading, logout } = useAuth();
  const accessQuery = useAccess(user?.id);
  const online = useOnlineStatus();
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [localSession, setLocalSession] = useState<{ userId: string; accessStamp: number } | null>(null);
  if (user && verifiedUserId !== user.id && accessQuery.isFetchedAfterMount &&
    !accessQuery.isError && accessQuery.data) setVerifiedUserId(user.id);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const transientFailure = accessQuery.isError &&
    (!(accessQuery.error instanceof ApiError) || accessQuery.error.status >= 500) &&
    accessQuery.error?.message !== 'Not authorized for this program';
  const offlineTeams = allowLocalScoring ? readOfflineTeams(user.id) : [];
  const denied = accessQuery.error instanceof ApiError && [401, 403].includes(accessQuery.error.status) ||
    accessQuery.error?.message === 'Not authorized for this program';
  const usingLocal = offlineTeams.length > 0 && !denied && (!online || transientFailure);
  if (usingLocal && (localSession?.userId !== user.id || (accessQuery.dataUpdatedAt ?? 0) > localSession.accessStamp)) {
    setLocalSession({ userId: user.id, accessStamp: accessQuery.dataUpdatedAt ?? 0 });
  }
  const awaitingRevalidation = localSession?.userId === user.id &&
    (!accessQuery.isFetchedAfterMount || accessQuery.isFetching || (accessQuery.dataUpdatedAt ?? 0) <= localSession.accessStamp);
  if (offlineTeams.length && !denied && (usingLocal || awaitingRevalidation)) {
    return <><CourtsideMatchbook localTeams={offlineTeams} cloudVerified={false} /></>;
  }
  if (localSession && !awaitingRevalidation) setLocalSession(null);

  // Fail closed until this mounted session has received its first fresh result.
  // Later background refetches must not unmount the live courtside entry screen.
  if (accessQuery.isLoading || !accessQuery.isFetchedAfterMount) {
    return <LoadingScreen />;
  }

  if (accessQuery.isError) {
    const transient = !(accessQuery.error instanceof ApiError) || accessQuery.error.status >= 500;
    if (transient && verifiedUserId === user.id && accessQuery.data &&
      (accessQuery.data.isAdmin || accessQuery.data.manageableTeamIds.length > 0) &&
      accessQuery.error?.message !== 'Not authorized for this program') {
      return <>{children}</>;
    }
    const unauthorized = accessQuery.error instanceof Error && accessQuery.error.message === 'Not authorized for this program';
    if (unauthorized) {
      return <AccessRequiredScreen email={user.email} onSignOut={logout} />;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
        <section className="w-full max-w-md border border-red-300/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">Connection problem</p>
          <h1 className="mt-3 text-3xl font-black">Could not verify access</h1>
          <p className="mt-3 text-sm font-bold text-slate-300">Your team data has not been opened. Check the connection and try again.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => accessQuery.refetch()} className="min-h-12 bg-teal-500 px-4 font-black text-slate-950">Try Again</button>
            <button type="button" onClick={logout} className="min-h-12 border border-white/20 bg-slate-800 px-4 font-black text-white">Sign Out</button>
          </div>
        </section>
      </main>
    );
  }

  const access = accessQuery.data;
  if (!access) {
    return <LoadingScreen />;
  }
  if (!access.isAdmin && access.manageableTeamIds.length === 0) return <AccessRequiredScreen email={user.email} onSignOut={logout} />;

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
          <Route path="/" element={
            <ProtectedRoute allowLocalScoring>
              <CourtsideMatchbook />
            </ProtectedRoute>
          } />
          <Route path="/matchbook" element={<Navigate to="/" replace />} />
          <Route path="/prototype" element={<Navigate to="/" replace />} />

          {/* Retained legacy workflow. The courtside matchbook above is the primary product. */}
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
