import { MainContainer } from "./components/MainContainer"
import { useWorkspace } from "@/contexts/workspace-context"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { WorkSpaceLayout } from "./WorkSpacePageLayout"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useEffect, useState } from "react"

const WorkSpacePage = () => {
    const { currentWorkspace, isLoading: isLoadingWorkspace, error: errorWorkspace } = useWorkspace()
    const { isLoading: isLoadingData, error: errorData } = useWorkspaceData()
    const [initialLoading, setInitialLoading] = useState(true)

    useEffect(() => {
        if (!isLoadingWorkspace && !isLoadingData) {
            setInitialLoading(false)
        }
    }, [isLoadingWorkspace, isLoadingData])

    if (initialLoading) {
        return (
            <WorkSpaceLayout>
                <LoadingPage />
            </WorkSpaceLayout>
        )
    }

    if (errorWorkspace || errorData) {
        return (
            <WorkSpaceLayout>
                <ErrorPage error={errorWorkspace} />
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