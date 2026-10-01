import { HashRouter, Route, Routes } from 'react-router-dom'

import { WorkspaceProvider } from './contexts/workspace-context'
import { WorkspaceDataProvider } from './contexts/workspace-data'
import { UndoProvider } from './contexts/undo'
import { PreferencesProvider } from './contexts/preferences-context'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/sonner'
import { ShortcutsProvider } from './contexts/shortcuts-context'
import { DialogShortcuts } from './components/dialogs/dialog-shortcuts'
import { TextContextMenu } from './components/text-context-menu'
import { getEditableTarget } from './lib/editable-target'

import MainPage from './pages/mainPage/MainPage'
import WorkSpacePage from './pages/workspacePage/WorkSpacePage'
import { useEffect } from 'react'

function App() {

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
            <HashRouter>
              <Routes>
                <Route path='/' element={<MainPage />} />
                <Route path='/workspace/:id' element={<WorkSpacePage />} />
              </Routes>
            </HashRouter>
            </UndoProvider>
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