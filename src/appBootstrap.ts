import { QueryClient, defaultShouldDehydrateQuery, type Query } from '@tanstack/react-query';
import { registerSW } from './pwaRegistration';
import { addRallyMutationFn, undoLastRallyMutationFn } from './hooks/queries/useRallies';
import { startSetMutationFn, updateSetMutationFn } from './hooks/queries/useSets';
import { startMatchMutationFn, updateMatchMutationFn } from './hooks/queries/useMatches';
import { APP_UPDATE_READY_EVENT } from './appUpdateEvents';

export const ONE_DAY = 1000 * 60 * 60 * 24;
export const LOCAL_CACHE_RETENTION_DAYS = 30;
export const LOCAL_CACHE_RETENTION_MS = ONE_DAY * LOCAL_CACHE_RETENTION_DAYS;
export const shouldPersistQuery = (query: Query) =>
  defaultShouldDehydrateQuery(query) && query.queryKey[0] !== 'access';

export const createAppQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Must be >= persistOptions.maxAge, or persisted queries get garbage
        // collected before they'd ever be restored.
        gcTime: LOCAL_CACHE_RETENTION_MS,
      },
      mutations: {
        // Retry transient failures (not just fully-offline invokes, which
        // networkMode already pauses/auto-resumes) instead of erroring out
        // to the rollback+toast path on the first flaky-wifi hiccup.
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      },
    },
  });

  // Mutation functions must be registered as defaults (keyed to match each
  // hook's mutationKey) so a mutation persisted while offline/killed can be
  // replayed on next launch without the original component closure that
  // created it - see src/db/queryPersister.ts.
  queryClient.setMutationDefaults(['startMatch'], { mutationFn: startMatchMutationFn });
  queryClient.setMutationDefaults(['updateMatch'], { mutationFn: updateMatchMutationFn });
  queryClient.setMutationDefaults(['startSet'], { mutationFn: startSetMutationFn });
  queryClient.setMutationDefaults(['addRally'], { mutationFn: addRallyMutationFn });
  queryClient.setMutationDefaults(['undoLastRally'], { mutationFn: undoLastRallyMutationFn });
  queryClient.setMutationDefaults(['updateSet'], { mutationFn: updateSetMutationFn });

  return queryClient;
};

export const registerAppServiceWorker = () => {
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent(APP_UPDATE_READY_EVENT, {
        detail: { updateServiceWorker },
      }));
    },
  });

  return updateServiceWorker;
};
