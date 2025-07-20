import { useEffect } from "react"
import { DialogCreateWorkspace } from "./components/DialogCreateWorkspace"
import { RefreshCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { MainPageLayout } from "./MainPageLayout"
import { WorkspacesContainer } from "./components/WorkspacesContainer"
import { TooltipCustom } from "@/components/tooltip-custom"

const MainPage = () => {
    const { workspaces, getWorkspaces, isLoading, error } = useWorkspace()

    useEffect(() => {
        getWorkspaces()
    }, [])

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
                </div>
                <div className="flex flex-col items-center justify-center w-full p-2 gap-2 border rounded-xs">
                    <div className="flex items-center justify-between w-full">
                        <h1 className="text-lg w-full ml-2">
                            Apri un Workspace recente:
                        </h1>
                        <TooltipCustom text="Ricarica i Workspace">
                            <Button onClick={getWorkspaces} variant="outline" size="icon" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                            </Button>
                        </TooltipCustom>
                    </div>
                    <WorkspacesContainer workspaces={workspaces} />
                </div>
            </div>
        </MainPageLayout>
    )
}

export default MainPage;