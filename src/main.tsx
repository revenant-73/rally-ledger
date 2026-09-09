import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { MatchProvider } from './context/MatchContext'
import { indexedDbPersister } from './db/queryPersister'
import { createAppQueryClient, ONE_DAY, registerAppServiceWorker, shouldPersistQuery } from './appBootstrap'

const queryClient = createAppQueryClient()
registerAppServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: indexedDbPersister,
        maxAge: ONE_DAY,
        dehydrateOptions: {
          shouldDehydrateMutation: () => true,
          // Authorization is a live security decision, never an offline cache.
          shouldDehydrateQuery: shouldPersistQuery,
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
