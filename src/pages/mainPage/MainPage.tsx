import { useEffect } from "react"
import { WorkSpaceItem } from "./components/WorkSpaceItem"
import { ButtonNewWorkspace } from "./components/ButtonNewWorkspace"
import { RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { MainPageLayout } from "./MainPageLayout"

const MainPage = () => {
    const { workspaces, getWorkspaces, isLoading, error } = useWorkspace()

    useEffect(() => {
        getWorkspaces()
    }, [])

    if (isLoading) {
        return (
            <MainPageLayout>
                <LoadingPage />
            </MainPageLayout>
        )
    }

    if (error) {
        return (
            <MainPageLayout>
                <ErrorPage error={error} />
            </MainPageLayout>
        )
    }

    return (
        <MainPageLayout>
            <div className="flex flex-col w-[600px] h-full items-center justify-center gap-8">
                <h1 className="font-bold text-4xl">Bentornato!</h1>
                <div className="flex w-full items-center justify-center gap-4">
                    <ButtonNewWorkspace />
                </div>
                <div className="flex flex-col items-center justify-center w-full p-2 gap-2 border rounded-md">
                    <div className="flex items-center justify-between w-full">
                        <h1 className="font-bold text-lg w-full ml-2">
                            Apri un Workspace recente:
                        </h1>
                        <Button onClick={getWorkspaces} variant="outline" size="icon">
                            <RefreshCcw />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 w-full p-1 overflow-y-auto h-[200px] lg:h-[350px] gap-1 transition- content-start">
                        {workspaces.length > 0 ? (
                            workspaces.map((ws) => (
                                <WorkSpaceItem
                                    key={ws.id}
                                    workspace={ws}
                                />
                            ))
                        ) : (
                            <h1 className="text-muted-foreground text-sm w-full">
                                Nessun workspace trovato
                            </h1>
                        )}
                    </div>
                </div>
            </div>
        </MainPageLayout>
    )
}

export default MainPage;
