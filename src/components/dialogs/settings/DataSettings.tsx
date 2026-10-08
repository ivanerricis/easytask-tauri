import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { Download, FolderOpen, TriangleAlert, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/form-error"
import { useWorkspace } from "@/contexts/use-workspace"
import { usePreferences } from "@/contexts/use-preferences"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UNDO_LIMIT_OPTIONS } from "@/lib/store/preferences"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { getErrorMessage } from "@/lib/utils"
import { BackupSettings } from "./BackupSettings"
import { SettingsPanel, SettingsRow, SettingsSubsection } from "./SettingsRow"

export const DataSettings = () => {
    const { t } = useTranslation()
    const { exportWorkspace, importWorkspace, isBusy } = useWorkspaceTransfer()
    const { currentWorkspace } = useWorkspace()
    const { undoLimit, setUndoLimit } = usePreferences()
    const { pathname } = useLocation()
    // currentWorkspace is not cleared on the start page: offer the export only inside a workspace
    const current = pathname.startsWith("/workspace/") ? currentWorkspace : null

    const [inOneDrive, setInOneDrive] = useState(false)

    useEffect(() => {
        // Best effort: a failed check just hides the warning
        invoke<boolean>("data_dir_in_onedrive")
            .then(setInOneDrive)
            .catch(() => setInOneDrive(false))
    }, [])

    const [folderError, setFolderError] = useState<string | null>(null)

    const openDataFolder = async () => {
        setFolderError(null)
        try {
            await invoke("open_data_folder")
        } catch (error) {
            setFolderError(getErrorMessage(error))
        }
    }

    return (
        <SettingsPanel title={t("settings.data.title")}>
            <SettingsSubsection title={t("settings.data.sections.transfer")}>
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
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.data.sections.folder")}>
                <SettingsRow label={t("settings.data.folder.label")} description={t("settings.data.folder.description")}>
                    <Button variant="outline" size="sm" onClick={() => void openDataFolder()}>
                        <FolderOpen />
                        {t("settings.data.folder.button")}
                    </Button>
                </SettingsRow>
                <FormError>{folderError}</FormError>
                {inOneDrive && (
                    // A standing notice, not an alert: it must not interrupt a screen reader every time the page opens
                    <Alert role="note" className="border-warning/50 bg-warning/10 text-foreground">
                        <TriangleAlert className="text-warning" />
                        <AlertDescription className="text-foreground">{t("settings.data.folder.oneDriveWarning")}</AlertDescription>
                    </Alert>
                )}
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.data.sections.backup")}>
                <BackupSettings />
            </SettingsSubsection>
            <SettingsSubsection title={t("settings.data.sections.history")}>
                <SettingsRow label={t("settings.data.undoLimit.label")} description={t("settings.data.undoLimit.description")}>
                    {({ id, descriptionId }) => (
                    <Select value={String(undoLimit)} onValueChange={value => setUndoLimit(Number(value))}>
                        <SelectTrigger id={id} aria-describedby={descriptionId} size="sm" className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {/* A limit outside the options (not reachable from the UI) is still shown */}
                            {!(UNDO_LIMIT_OPTIONS as readonly number[]).includes(undoLimit) && <SelectItem value={String(undoLimit)}>{undoLimit}</SelectItem>}
                            {UNDO_LIMIT_OPTIONS.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                </SettingsRow>
            </SettingsSubsection>
            {/* Further subsections are appended here as <SettingsSubsection> */}
        </SettingsPanel>
    )
}
