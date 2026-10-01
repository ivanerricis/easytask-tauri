import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './index.css'
import App from './App.tsx'
import { flushPreferences, getLanguage } from './lib/store/preferences'
import { initI18n } from './i18n'
import { reportError } from './lib/report-error'
import { runAutoBackup } from './db/backup'

// Debounced preference saves must not be lost when the app closes
window.addEventListener('beforeunload', () => { void flushPreferences() })
try {
  void getCurrentWindow().onCloseRequested(async () => {
    await flushPreferences().catch(error => reportError(error))
  }).catch(error => reportError(error))
} catch (e) {
  reportError(e)
}

// The stored language is applied before the first render so the UI never flashes in the wrong language
const start = async () => {
  initI18n(await getLanguage().catch(() => 'system' as const))
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  // Daily backup, best effort: delayed so it does not compete with the first render
  setTimeout(() => { void runAutoBackup() }, 3000)
}
void start()
