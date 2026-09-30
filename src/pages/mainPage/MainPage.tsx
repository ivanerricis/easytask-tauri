import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { DialogCreateWorkspace } from "./components/DialogCreateWorkspace"
import { RefreshCcw, Loader2, LayoutGrid, LayoutList, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { MainPageLayout } from "./MainPageLayout"
import { WorkspacesContainer } from "./components/WorkspacesContainer"
import { TooltipCustom } from "@/components/tooltip-custom"
import { usePreferences } from "@/contexts/preferences-context"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { getLastWorkspaceId, getReopenLastWorkspace } from "@/lib/store/preferences"

// The last workspace is restored at most once per app session
let startupHandled = false

/** Resets the once-per-session startup flag (tests only). */
// eslint-disable-next-line react-refresh/only-export-components
export const resetStartupHandled = () => { startupHandled = false }

const MainPage = () => {
    const { workspaces, getWorkspaces, setCurrentWorkspace, isLoading, error } = useWorkspace()
    const navigate = useNavigate()
    const [loaded, setLoaded] = useState(false)
    const { workspaceView, setWorkspaceView } = usePreferences()
    const { importWorkspace, isBusy: isImporting } = useWorkspaceTransfer()
    const isList = workspaceView === "list"

    useEffect(() => {
        getWorkspaces().then(() => setLoaded(true)).catch(console.error)
    }, [getWorkspaces])

    // Preferences are read from the store (not the context) to avoid racing the context defaults
    useEffect(() => {
        if (!loaded || startupHandled) return
        startupHandled = true
        const restore = async () => {
            if (!await getReopenLastWorkspace()) return
            const id = await getLastWorkspaceId()
            const ws = workspaces.find(w => w.id === id)
            if (!ws) return
            setCurrentWorkspace(ws)
            navigate(`/workspace/${ws.id}`)
        }
        restore().catch(console.error)
    }, [loaded, workspaces, setCurrentWorkspace, navigate])

    const isInitialLoading = isLoading && workspaces.length === 0;

    if (isInitialLoading) {
        return (
            <MainPageLayout>
                <LoadingPage text="Caricamento dei Workspace..."/>
            </MainPageLayout>
        )
    }

    if (error && workspaces.length === 0) {
        return (
            <MainPageLayout>
                <ErrorPage error={error} />
            </MainPageLayout>
        )
    }

    return (
        <MainPageLayout>
            <div className="flex flex-col w-[600px] h-full items-center justify-center gap-8">
                <h1 className="text-4xl">Bentornato!</h1>
                <div className="flex w-full items-center justify-center gap-4">
                    <DialogCreateWorkspace />
                    <Button variant="outline" onClick={() => void importWorkspace()} disabled={isImporting}>
                        <Upload />
                        Importa workspace
                    </Button>
                </div>
                <div className="flex flex-col items-center justify-center w-full p-2 gap-2 border rounded-xs">
                    <div className="flex items-center justify-between w-full">
                        <h1 className="text-lg w-full ml-2">
                            Apri un Workspace recente:
                        </h1>
                        <div className="flex items-center gap-1">
                            <TooltipCustom text={isList ? "Visualizza come griglia" : "Visualizza come lista"}>
                                <Button
                                    onClick={() => setWorkspaceView(isList ? "grid" : "list")}
                                    variant="outline"
                                    size="icon"
                                    aria-label={isList ? "Visualizza come griglia" : "Visualizza come lista"}>
                                    {isList ? <LayoutGrid /> : <LayoutList />}
                                </Button>
                            </TooltipCustom>
                            <TooltipCustom text="Ricarica i Workspace">
                                <Button onClick={() => getWorkspaces().catch(console.error)} variant="outline" size="icon" aria-label="Ricarica i Workspace" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                                </Button>
                            </TooltipCustom>
                        </div>
                    </div>
                    <WorkspacesContainer workspaces={workspaces} view={workspaceView} />
                </div>
            </div>
        </MainPageLayout>
    )
}

export default MainPage;