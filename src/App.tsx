import { HashRouter, Route, Routes } from 'react-router-dom'

import { WorkspaceProvider } from './contexts/workspace-context'
import { WorkspaceDataProvider } from './contexts/workspace-data-context'
import { ThemeProvider } from './components/theme-provider'

// import { PasswordPage } from './pages/passwordPage/PasswordPage'
// import LoginPage from './pages/loginPage/LoginPage'
import MainPage from './pages/mainPage/MainPage'
import WorkSpacePage from './pages/workspacePage/WorkSpacePage'
import { Toaster } from './components/ui/sonner'

function App() {

  return (
    <WorkspaceProvider>
      <WorkspaceDataProvider>
        <ThemeProvider>
          <HashRouter>
            <Routes>
              {/* <Route path='/' element={<PasswordPage />} /> */}
              {/* <Route path='/login/' element={<LoginPage />} /> */}
              <Route path='/' element={<MainPage />} />
              <Route path='/workspace/:id' element={<WorkSpacePage />} />
            </Routes>
          </HashRouter>
          <Toaster richColors position='top-center' />
        </ThemeProvider>
      </WorkspaceDataProvider>
    </WorkspaceProvider>
  )
}

export default App