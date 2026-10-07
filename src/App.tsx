import { HashRouter, Route, Routes } from 'react-router-dom'

import { WorkspaceProvider } from './contexts/workspace-context'
import { WorkspaceDataProvider } from './contexts/workspace-data'
import { UndoProvider } from './contexts/undo'
import { PreferencesProvider } from './contexts/preferences-context'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import { ShortcutsProvider } from './contexts/shortcuts-context'
import { DialogShortcuts } from './components/dialogs/dialog-shortcuts'
import { DialogUpdate } from './components/dialogs/dialog-update'
import { TextContextMenu } from './components/text-context-menu'
import { getEditableTarget } from './lib/editable-target'

import { ErrorBoundary } from './components/error-boundary'
import { LoadingPage } from './components/pages/loading-page'
import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const MainPage = lazy(() => import('./pages/mainPage/MainPage'))
const loadWorkSpacePage = () => import('./pages/workspacePage/WorkSpacePage')
const WorkSpacePage = lazy(loadWorkSpacePage)

function App() {
  const { t } = useTranslation()

  // The note page is the biggest chunk: load it once the home page is up, so opening the first workspace does not wait for it
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkSpacePage() }, 1000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Text fields get their own menu (TextContextMenu); everything else is blocked.
      if (!target.closest("[data-contextmenu]") && !getEditableTarget(target)) {
        e.preventDefault()
      }
    }

    window.addEventListener("contextmenu", handler)
    return () => window.removeEventListener("contextmenu", handler)
  }, [])


  return (
    <PreferencesProvider>
      <ShortcutsProvider>
      <ThemeProvider>
        <WorkspaceProvider>
          <WorkspaceDataProvider>
            <UndoProvider>
            {/* No transitions: a route that is not ready yet shows its loading page at once, instead of the old page frozen until the new one is ready */}
            <HashRouter useTransitions={false}>
              <Routes>
                <Route path='/' element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingPage text={t('home.loading')} />}><MainPage /></Suspense>
                  </ErrorBoundary>
                } />
                <Route path='/workspace/:id' element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingPage text={t('workspace.loading')} />}><WorkSpacePage /></Suspense>
                  </ErrorBoundary>
                } />
              </Routes>
            </HashRouter>
            </UndoProvider>
            <Toaster richColors closeButton position='top-center' toastOptions={{ closeButtonAriaLabel: t('common.close') }} />
            <DialogShortcuts />
            <DialogUpdate />
            <TextContextMenu />
          </WorkspaceDataProvider>
        </WorkspaceProvider>
      </ThemeProvider>
      </ShortcutsProvider>
    </PreferencesProvider >
  )
}

export default App