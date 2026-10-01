import { useTranslation } from "react-i18next"
import { MainContainer } from "./components/MainContainer"
import { useWorkspace } from "@/contexts/use-workspace"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { WorkSpaceLayout } from "./WorkSpacePageLayout"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useEffect, useState } from "react"
import { AudioProvider } from "@/contexts/audio-context"
import { saveLastWorkspaceId } from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"

const WorkSpacePage = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { error, getWorkspaceData } = useWorkspaceData()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (currentWorkspace)
                    await getWorkspaceData(currentWorkspace.id)
            } catch (err) {
                // The failure is shown by the error page (context `error`), so no toast
                reportError(err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [currentWorkspace, getWorkspaceData])

    // Remember the open workspace so it can be restored at the next startup
    useEffect(() => {
        if (currentWorkspace) saveLastWorkspaceId(currentWorkspace.id).catch(error => reportError(error))
    }, [currentWorkspace])

    if (isLoading) {
        return (
            <WorkSpaceLayout>
                <LoadingPage text={t("workspace.loading")} />
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