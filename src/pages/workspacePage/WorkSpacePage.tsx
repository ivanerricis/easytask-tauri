import { useTranslation } from "react-i18next"
import { MainContainer } from "./components/MainContainer"
import { useWorkspace } from "@/contexts/use-workspace"
import { ErrorPage } from "@/components/pages/error-page"
import { LoadingPage } from "@/components/pages/loading-page"
import { WorkSpaceLayout } from "./WorkSpacePageLayout"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useEffect } from "react"
import { AudioProvider } from "@/contexts/audio-context"
import { saveLastWorkspaceId } from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"

const WorkSpacePage = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { error, getWorkspaceData, loadedWorkspaceId } = useWorkspaceData()

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (currentWorkspace)
                    await getWorkspaceData(currentWorkspace.id)
            } catch (err) {
                // The failure is shown by the error page (context `error`), so no toast
                reportError(err)
            }
        }
        fetchData()
    }, [currentWorkspace, getWorkspaceData])

    // Remember the open workspace so it can be restored at the next startup
    useEffect(() => {
        if (currentWorkspace) saveLastWorkspaceId(currentWorkspace.id).catch(error => reportError(error))
    }, [currentWorkspace])

    if (error) {
        return (
            <WorkSpaceLayout>
                <ErrorPage error={error} />
            </WorkSpaceLayout>
        )
    }

    if (!currentWorkspace) return null

    // The data of the open workspace is not loaded yet (opened from the home page or switched from the combobox):
    // show the loading page instead of the (empty or previous) content
    if (loadedWorkspaceId !== currentWorkspace.id) {
        return (
            <WorkSpaceLayout>
                <LoadingPage text={t("workspace.loading")} />
            </WorkSpaceLayout>
        )
    }

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