import { useEffect, useState } from 'react';
import { APP_OFFLINE_READY_EVENT, APP_UPDATE_READY_EVENT, getPendingAppUpdate, type UpdateServiceWorker } from '../appUpdateEvents';
import { readOfflineTeams } from './offlineWorkspace';

export const OfflineDeviceStatus = ({ userId, teamId, localSaved, safeToUpdate }: {
  userId: string; teamId: string; localSaved: boolean; safeToUpdate: boolean;
}) => {
  const [cachedApp, setCachedApp] = useState(false);
  const [preparedTeam, setPreparedTeam] = useState(false);
  const [updateApp, setUpdateApp] = useState<UpdateServiceWorker | null>(() => getPendingAppUpdate());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (mounted) {
          setCachedApp(Boolean(registration?.active));
          setPreparedTeam(readOfflineTeams(userId).some((team) => team.id === teamId));
        }
      } catch { if (mounted) setCachedApp(false); }
    };
    const update = (event: Event) => {
      const candidate = (event as CustomEvent<{ updateServiceWorker?: UpdateServiceWorker }>).detail?.updateServiceWorker;
      if (candidate) setUpdateApp(() => candidate);
    };
    void check();
    window.addEventListener(APP_OFFLINE_READY_EVENT, check);
    window.addEventListener(APP_UPDATE_READY_EVENT, update);
    navigator.serviceWorker?.addEventListener('controllerchange', check);
    return () => {
      mounted = false;
      window.removeEventListener(APP_OFFLINE_READY_EVENT, check);
      window.removeEventListener(APP_UPDATE_READY_EVENT, update);
      navigator.serviceWorker?.removeEventListener('controllerchange', check);
    };
  }, [userId, teamId, localSaved]);

  const checkSetup = async () => {
    setChecking(true);
    try {
      // Best effort: WebKit chooses whether to grant durable storage.
      await navigator.storage?.persist?.();
      const registration = await navigator.serviceWorker?.getRegistration();
      setCachedApp(Boolean(registration?.active));
      setPreparedTeam(readOfflineTeams(userId).some((team) => team.id === teamId));
    } catch { setCachedApp(false); }
    finally { setChecking(false); }
  };
  const ready = cachedApp && preparedTeam && localSaved;
  return (
    <section className="rounded border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-200">
      <p role="status" className="font-bold">{ready ? 'Ready to reopen offline on this device' : 'Offline setup needs an online visit'}</p>
      <p className="mt-1 text-xs leading-relaxed">{ready ? 'Use this Home Screen app and keep its data. Download a backup after each match.' : 'Open this team online and check again before match night.'}</p>
      <button type="button" onClick={() => void checkSetup()} disabled={checking} className="mt-2 min-h-11 rounded border border-white/20 px-3 text-xs font-black">{checking ? 'Checking…' : 'Check offline setup'}</button>
      {updateApp ? <div className="mt-2 border-t border-white/15 pt-2">
        <p className="text-xs">{safeToUpdate ? 'An app update is ready.' : 'An update is ready. Finish the match and confirm cloud saving before updating.'}</p>
        <button type="button" disabled={!safeToUpdate} onClick={() => void updateApp(true)} className="mt-2 min-h-11 rounded bg-teal-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Update app</button>
      </div> : null}
    </section>
  );
};
