import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { MatchProvider } from './context/MatchContext'

const queryClient = new QueryClient()

console.log('App is starting...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MatchProvider>
          <App />
        </MatchProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
