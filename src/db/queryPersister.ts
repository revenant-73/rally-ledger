import { get, set, del } from 'idb-keyval';
import type { Persister } from '@tanstack/react-query-persist-client';

const STORAGE_KEY = 'century-matchbook-query-cache';
export const RESTORE_TIMEOUT_MS = 1500;

const ignoreStorageFailure = async (operation: Promise<unknown>) => {
  try {
    await operation;
  } catch {
    // IndexedDB can be unavailable in private browsing or an installed iOS PWA.
    // Cloud-backed app state must remain usable even when the query cache is not.
  }
};

// Persists the TanStack Query cache (including paused/pending mutations) to
// IndexedDB so a lost connection or the app being killed mid-match doesn't
// lose a rally write - it resumes and retries once the app reopens online.
export const indexedDbPersister: Persister = {
  persistClient: async (client) => {
    await ignoreStorageFailure(set(STORAGE_KEY, client));
  },
  restoreClient: async () => {
    try {
      return await Promise.race([
        get(STORAGE_KEY),
        new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), RESTORE_TIMEOUT_MS)),
      ]);
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    await ignoreStorageFailure(del(STORAGE_KEY));
  },
};
