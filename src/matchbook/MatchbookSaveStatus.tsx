import type { MatchbookSyncStatus } from './matchbookSync';

export const MatchbookSaveStatus = ({ status, localSaved, savedAt, onBackup, onRetry }: {
  status: MatchbookSyncStatus;
  localSaved: boolean;
  savedAt: string;
  onBackup: () => void;
  onRetry: () => void;
}) => {
  const title = !localSaved ? status === 'saved' ? 'Cloud saved · device storage problem' : 'Device storage problem' : status === 'saved' ? 'Saved to cloud' :
    status === 'local' ? 'Offline workspace · saved on this device' :
    status === 'offline' ? 'Connection lost · saved on this device' :
    status === 'conflict' ? 'Cloud copy changed · local copy kept' :
    status === 'auth' ? 'Sign-in needs attention · local copy kept' :
    status === 'error' ? 'Cloud unavailable · saved on this device' : 'Saved on this device · syncing';
  const message = !localSaved ? status === 'saved' ? 'The cloud has your entries, but local saving failed. Download a backup before scoring offline.' : 'Local saving failed. Download a backup now. Keep this app open until cloud saving succeeds.' :
    status === 'local' ? 'Keep scoring. Uploads wait for a connection and a fresh access check, then resume automatically while the app is open. Keep using this device.' :
    status === 'offline' || status === 'error' ? 'Keep scoring. Your data will upload automatically when the connection returns while this app is open. Keep using this device.' :
    status === 'conflict' ? 'Automatic upload is paused to protect both copies. Download a backup before resolving the other device’s changes.' :
    status === 'auth' ? 'Download a backup, then reconnect and sign in again to resume cloud saving.' :
    status === 'saved' ? 'This device and the cloud have the latest entries.' : 'Scoring is saved locally while the cloud catches up.';
  const warning = !localSaved || status === 'conflict' || status === 'auth';
  return (
    <section className={`my-2 rounded border px-3 py-2 ${warning ? 'border-red-400/60 bg-red-950/40 text-red-100' : status === 'saved' ? 'border-teal-400/30 bg-teal-950/30 text-teal-100' : 'border-amber-300/50 bg-amber-950/40 text-amber-100'}`}>
      <div role={warning ? 'alert' : 'status'} aria-live={warning ? 'assertive' : 'polite'}>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs font-bold leading-relaxed">{message}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {localSaved && savedAt ? <span className="mr-auto text-xs">Device save: {new Date(savedAt).toLocaleTimeString()}</span> : null}
        <button type="button" onClick={onBackup} className="min-h-11 rounded border border-current/30 px-3 text-xs font-black focus:outline-none focus:ring-2 focus:ring-teal-300">Download backup</button>
        {status === 'error' || status === 'local' ? <button type="button" onClick={onRetry} className="min-h-11 rounded border border-current/30 px-3 text-xs font-black">{status === 'local' ? 'Check connection' : 'Retry upload'}</button> : null}
      </div>
    </section>
  );
};
