import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './index.css'
import App from './App.tsx'
import { flushPreferences } from './lib/store/preferences'
import { reportError } from './lib/report-error'

// Debounced preference saves must not be lost when the app closes
window.addEventListener('beforeunload', () => { void flushPreferences() })
try {
  void getCurrentWindow().onCloseRequested(async () => {
    await flushPreferences().catch(error => reportError(error))
  }).catch(error => reportError(error))
} catch (e) {
  reportError(e)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
