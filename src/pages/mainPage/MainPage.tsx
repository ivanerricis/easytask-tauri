import { useEffect, useState } from "react"
import { DialogCreateWorkspace } from "./components/DialogCreateWorkspace"
import { RefreshCcw, Loader2, LayoutGrid, LayoutList, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/use-workspace"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { MainPageLayout } from "./MainPageLayout"
import { WorkspacesContainer } from "./components/WorkspacesContainer"
import { TooltipCustom } from "@/components/tooltip-custom"
import { usePreferences } from "@/contexts/use-preferences"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { reportError } from "@/lib/report-error"
import { useStartupRestore } from "./startup-restore"

const MainPage = () => {
    const { workspaces, getWorkspaces, isLoading, error } = useWorkspace()
    const [loaded, setLoaded] = useState(false)
    const { workspaceView, setWorkspaceView } = usePreferences()
    const { importWorkspace, isBusy: isImporting } = useWorkspaceTransfer()
    const isList = workspaceView === "list"
    const { pending: restorePending } = useStartupRestore(loaded)

    useEffect(() => {
        getWorkspaces().catch(error => reportError(error)).finally(() => setLoaded(true))
    }, [getWorkspaces])

    const isInitialLoading = (isLoading && workspaces.length === 0) || restorePending

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
            <div className="flex flex-col w-full max-w-[600px] px-4 h-full items-center justify-center gap-8">
                <h1 className="text-4xl">Bentornato!</h1>
                <div className="flex w-full flex-wrap items-center justify-center gap-3">
                    <DialogCreateWorkspace />
                    <Button
                        variant="outline"
                        onClick={() => void importWorkspace()}
                        disabled={isImporting}
                        className="flex items-center justify-center w-[276px] max-w-full p-6 rounded-full gap-2 text-lg border-primary transition-all"
                    >
                        Importa un Workspace
                        {isImporting ? <Loader2 className="h-5! w-5! animate-spin" /> : <Upload className="h-5! w-5!" />}
                    </Button>
                </div>
                <div className="flex flex-col items-center justify-center w-full p-2 gap-2 border rounded-xs">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="text-lg w-full ml-2">
                            Apri un Workspace recente:
                        </h2>
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
                                <Button onClick={() => getWorkspaces().catch(error => reportError(error, "Impossibile ricaricare i Workspace. Riprova."))} variant="outline" size="icon" aria-label="Ricarica i Workspace" disabled={isLoading}>
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