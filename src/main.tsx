import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './index.css'
import App from './App.tsx'
import { flushPreferences } from './lib/store/preferences'

// Debounced preference saves must not be lost when the app closes
window.addEventListener('beforeunload', () => { void flushPreferences() })
try {
  void getCurrentWindow().onCloseRequested(async () => {
    await flushPreferences().catch(console.error)
  }).catch(console.error)
} catch (e) {
  console.error(e)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
