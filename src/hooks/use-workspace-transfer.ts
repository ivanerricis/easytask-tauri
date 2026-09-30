import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useWorkspace } from "@/contexts/workspace-context"
import { exportWorkspaceToFile, importWorkspaceFromFile } from "@/lib/workspace-transfer"
import { getErrorMessage } from "@/lib/utils"

/**
 * Click handlers for the workspace export/import, with their toasts. Shared by the menus and the settings.
 * @category Hooks
 */
export function useWorkspaceTransfer() {
    const { getWorkspaces } = useWorkspace()
    const [isBusy, setBusy] = useState(false)

    const exportWorkspace = useCallback(async (workspace: { id: number, name: string }) => {
        setBusy(true)
        try {
            if (await exportWorkspaceToFile(workspace)) toast.success("Workspace esportato")
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setBusy(false)
        }
    }, [])

    const importWorkspace = useCallback(async () => {
        setBusy(true)
        try {
            const result = await importWorkspaceFromFile()
            if (!result) return
            await getWorkspaces()
            toast.success("Workspace importato" + (result.skippedAudio > 0 ? ` · ${result.skippedAudio} audio saltati` : ""))
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setBusy(false)
        }
    }, [getWorkspaces])

    return { exportWorkspace, importWorkspace, isBusy }
}
