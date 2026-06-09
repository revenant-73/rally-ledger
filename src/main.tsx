import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MatchProvider } from './context/MatchContext'

console.log('App is starting...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MatchProvider>
      <App />
    </MatchProvider>
  </StrictMode>,
)
