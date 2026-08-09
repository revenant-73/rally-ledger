import { get, set, del } from 'idb-keyval';
import type { Persister } from '@tanstack/react-query-persist-client';

const STORAGE_KEY = 'century-matchbook-query-cache';

// Persists the TanStack Query cache (including paused/pending mutations) to
// IndexedDB so a lost connection or the app being killed mid-match doesn't
// lose a rally write - it resumes and retries once the app reopens online.
export const indexedDbPersister: Persister = {
  persistClient: async (client) => {
    await set(STORAGE_KEY, client);
  },
  restoreClient: async () => {
    return await get(STORAGE_KEY);
  },
  removeClient: async () => {
    await del(STORAGE_KEY);
  },
};
