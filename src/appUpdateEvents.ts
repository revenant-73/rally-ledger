export const APP_UPDATE_READY_EVENT = 'rally-ledger:update-ready';
export const APP_OFFLINE_READY_EVENT = 'matchbook:offline-ready';
export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;
let pendingUpdate: UpdateServiceWorker | null = null;
export const rememberAppUpdate = (update: UpdateServiceWorker) => { pendingUpdate = update; };
export const getPendingAppUpdate = () => pendingUpdate;
