import i18n from "@/i18n"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useWorkspace } from "@/contexts/use-workspace"
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
            if (await exportWorkspaceToFile(workspace)) toast.success(i18n.t("transfer.exported"))
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
            toast.success(result.skippedAudio > 0 ? i18n.t("transfer.importedSkipped", { count: result.skippedAudio }) : i18n.t("transfer.imported"))
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setBusy(false)
        }
    }, [getWorkspaces])

    return { exportWorkspace, importWorkspace, isBusy }
}
