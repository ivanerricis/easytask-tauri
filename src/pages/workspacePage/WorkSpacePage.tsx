import { MainContainer } from "./components/MainContainer"
import { useWorkspace } from "@/contexts/workspace-context"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { WorkSpaceLayout } from "./WorkSpacePageLayout"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useEffect, useState } from "react"
import { AudioProvider } from "@/contexts/audio-context"
import { saveLastWorkspaceId } from "@/lib/store/preferences"

const WorkSpacePage = () => {
    const { currentWorkspace } = useWorkspace()
    const { error, getWorkspaceData } = useWorkspaceData()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (currentWorkspace)
                    await getWorkspaceData(currentWorkspace.id)
            } catch (err) {
                console.error(err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [currentWorkspace, getWorkspaceData])

    // Remember the open workspace so it can be restored at the next startup
    useEffect(() => {
        if (currentWorkspace) saveLastWorkspaceId(currentWorkspace.id).catch(console.error)
    }, [currentWorkspace])

    if (isLoading) {
        return (
            <WorkSpaceLayout>
                <LoadingPage text="Caricamento dati del Workspace..." />
            </WorkSpaceLayout>
        )
    }

    if (error) {
        return (
            <WorkSpaceLayout>
                <ErrorPage error={error} />
            </WorkSpaceLayout>
        )
    }

    if (!currentWorkspace) return null

    // The audio provider wraps both the note view and the floating player (rendered by MainContainer)
    return (
        <AudioProvider>
            <WorkSpaceLayout>
                <MainContainer />
            </WorkSpaceLayout>
        </AudioProvider>
    )
}

export default WorkSpacePage