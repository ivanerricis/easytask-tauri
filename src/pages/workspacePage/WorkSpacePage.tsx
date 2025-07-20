import { MainContainer } from "./components/MainContainer"
import { useWorkspace } from "@/contexts/workspace-context"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { WorkSpaceLayout } from "./WorkSpacePageLayout"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useEffect, useState } from "react"

const WorkSpacePage = () => {
    const { currentWorkspace } = useWorkspace()
    const { error, getWorkspaceData, } = useWorkspaceData()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            if (isLoading) {
                if (currentWorkspace)
                    await getWorkspaceData(currentWorkspace.id)
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

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

    return (
        <WorkSpaceLayout>
            <MainContainer />
        </WorkSpaceLayout>
    )
}

export default WorkSpacePage