import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { MatchProvider } from './context/MatchContext'
import { indexedDbPersister } from './db/queryPersister'
import { addRallyMutationFn, undoLastRallyMutationFn } from './hooks/queries/useRallies'
import { updateSetMutationFn } from './hooks/queries/useSets'

const ONE_DAY = 1000 * 60 * 60 * 24

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Must be >= persistOptions.maxAge, or persisted queries get garbage
      // collected before they'd ever be restored.
      gcTime: ONE_DAY,
    },
    mutations: {
      // Retry transient failures (not just fully-offline invokes, which
      // networkMode already pauses/auto-resumes) instead of erroring out
      // to the rollback+toast path on the first flaky-wifi hiccup.
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
})

// Mutation functions must be registered as defaults (keyed to match each
// hook's mutationKey) so a mutation persisted while offline/killed can be
// replayed on next launch without the original component closure that
// created it - see src/db/queryPersister.ts.
queryClient.setMutationDefaults(['addRally'], { mutationFn: addRallyMutationFn })
queryClient.setMutationDefaults(['undoLastRally'], { mutationFn: undoLastRallyMutationFn })
queryClient.setMutationDefaults(['updateSet'], { mutationFn: updateSetMutationFn })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: indexedDbPersister,
        maxAge: ONE_DAY,
        dehydrateOptions: {
          shouldDehydrateMutation: () => true,
        },
      }}
      onSuccess={() => {
        queryClient.resumePausedMutations()
      }}
    >
      <AuthProvider>
        <MatchProvider>
          <App />
        </MatchProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
