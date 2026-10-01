import { HashRouter, Route, Routes } from 'react-router-dom'

import { WorkspaceProvider } from './contexts/workspace-context'
import { WorkspaceDataProvider } from './contexts/workspace-data'
import { PreferencesProvider } from './contexts/preferences-context'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import { ShortcutsProvider } from './contexts/shortcuts-context'
import { DialogShortcuts } from './components/dialogs/dialog-shortcuts'
import { TextContextMenu } from './components/text-context-menu'
import { getEditableTarget } from './lib/editable-target'

import { ErrorBoundary } from './components/error-boundary'
import { LoadingPage } from './components/pages/loading-page'
import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const MainPage = lazy(() => import('./pages/mainPage/MainPage'))
const WorkSpacePage = lazy(() => import('./pages/workspacePage/WorkSpacePage'))

function App() {
  const { t } = useTranslation()

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
            <HashRouter>
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
            <Toaster richColors position='top-center' />
            <DialogShortcuts />
            <TextContextMenu />
          </WorkspaceDataProvider>
        </WorkspaceProvider>
      </ThemeProvider>
      </ShortcutsProvider>
    </PreferencesProvider >
  )
}

export default App