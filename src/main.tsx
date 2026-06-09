import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { MatchProvider } from './context/MatchContext'

console.log('App is starting...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MatchProvider>
        <App />
      </MatchProvider>
    </AuthProvider>
  </StrictMode>,
)
