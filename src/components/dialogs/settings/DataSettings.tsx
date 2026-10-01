import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"
import { Download, FolderOpen, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { getErrorMessage } from "@/lib/utils"
import { BackupSettings } from "./BackupSettings"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const DataSettings = () => {
    const { t } = useTranslation()
    const { exportWorkspace, importWorkspace, isBusy } = useWorkspaceTransfer()
    const { currentWorkspace } = useWorkspace()
    const { pathname } = useLocation()
    // currentWorkspace is not cleared on the start page: offer the export only inside a workspace
    const current = pathname.startsWith("/workspace/") ? currentWorkspace : null

    const openDataFolder = async () => {
        try {
            await invoke("open_data_folder")
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <SettingsPanel title={t("settings.data.title")}>
            <SettingsRow label={t("settings.data.import.label")} description={t("settings.data.import.description")}>
                <Button variant="outline" size="sm" disabled={isBusy} onClick={() => void importWorkspace()}>
                    <Upload />
                    {t("settings.data.import.button")}
                </Button>
            </SettingsRow>
            {current && (
                <SettingsRow label={t("settings.data.export.label")} description={t("settings.data.export.description", { name: current.name })}>
                    <Button variant="outline" size="sm" disabled={isBusy} onClick={() => void exportWorkspace(current)}>
                        <Download />
                        {t("settings.data.export.button")}
                    </Button>
                </SettingsRow>
            )}
            <SettingsRow label={t("settings.data.folder.label")} description={t("settings.data.folder.description")}>
                <Button variant="outline" size="sm" onClick={() => void openDataFolder()}>
                    <FolderOpen />
                    {t("settings.data.folder.button")}
                </Button>
            </SettingsRow>
            <BackupSettings />
        </SettingsPanel>
    )
}
