import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, History, Settings, Cloud, BarChart3, RefreshCw, WifiOff } from 'lucide-react';
import { useIsMutating, useMutationState } from '@tanstack/react-query';
import { useMatch } from '../hooks/useMatch';
import { APP_UPDATE_READY_EVENT, type UpdateServiceWorker } from '../appUpdateEvents';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSyncing } = useMatch();
  const isOnline = useOnlineStatus();
  const pendingMutationCount = useIsMutating();
  const pausedMutationCount = useMutationState({
    filters: { predicate: mutation => mutation.state.isPaused },
    select: () => true,
  }).length;
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null);

  useEffect(() => {
    const handleUpdateReady = (event: Event) => {
      const updateEvent = event as CustomEvent<{ updateServiceWorker?: UpdateServiceWorker }>;
      setUpdateServiceWorker(() => updateEvent.detail.updateServiceWorker ?? null);
    };

    window.addEventListener(APP_UPDATE_READY_EVENT, handleUpdateReady);

    return () => {
      window.removeEventListener(APP_UPDATE_READY_EVENT, handleUpdateReady);
    };
  }, []);

  const showSyncing = isSyncing || pendingMutationCount > 0;
  const statusTone = !isOnline || pausedMutationCount > 0
    ? 'border-brand-amber/40 bg-brand-amber/15 text-brand-amber'
    : showSyncing
      ? 'border-brand-teal/40 bg-brand-teal/15 text-brand-teal'
      : 'border-brand-gray/20 bg-brand-gray/10 text-brand-text-secondary';
  const statusIcon = !isOnline || pausedMutationCount > 0
    ? <WifiOff size={15} />
    : <Cloud size={15} />;
  const statusText = !isOnline
    ? 'Offline'
    : pausedMutationCount > 0
      ? `${pausedMutationCount} queued`
      : showSyncing
        ? pendingMutationCount > 1 ? `${pendingMutationCount} syncing` : 'Syncing'
        : 'Synced';

  const handleUpdate = () => {
    if (updateServiceWorker) {
      updateServiceWorker(true);
      return;
    }
    window.location.reload();
  };

  const navItems = [
    { icon: <Home size={24} />, label: 'Home', path: '/app' },
    { icon: <Users size={24} />, label: 'Roster', path: '/app/roster' },
    { icon: <History size={24} />, label: 'History', path: '/app/history' },
    { icon: <BarChart3 size={24} />, label: 'Reports', path: '/app/reports' },
    { icon: <Settings size={24} />, label: 'Settings', path: '/app/settings' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-brand-text">
      <div className="print-hide fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
        {updateServiceWorker && (
          <button
            onClick={handleUpdate}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-brand-green shadow-lg backdrop-blur-sm"
          >
            <RefreshCw size={15} />
            Update Ready
          </button>
        )}
        <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide shadow-lg backdrop-blur-sm ${statusTone} ${showSyncing ? 'animate-pulse' : ''}`}>
          {statusIcon}
          {statusText}
        </div>
      </div>
      <main className="flex-1 pb-20 overflow-auto">
        <Outlet />
      </main>
      
      <nav className="print-hide fixed bottom-0 left-0 right-0 bg-brand-bg border-t border-brand-gray/20 px-6 py-3">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === item.path ? 'text-brand-teal' : 'text-brand-text-secondary'
              }`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
