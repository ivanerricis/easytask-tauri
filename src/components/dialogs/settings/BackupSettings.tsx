import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@tauri-apps/api/core"
import { ArchiveRestore, DatabaseBackup, FolderOpen, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "../dialog-confirm"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { TooltipCustom } from "@/components/tooltip-custom"
import {
    createBackup,
    deleteBackup,
    listBackups,
    restoreBackup,
    type BackupInfo,
} from "@/db/backup"
import { reportError } from "@/lib/report-error"
import {
    clampBackupKeep,
    DEFAULT_BACKUP_KEEP,
    getAutoBackup,
    getBackupKeep,
    MAX_BACKUP_KEEP,
    MIN_BACKUP_KEEP,
    saveAutoBackup,
    saveBackupKeep,
} from "@/lib/store/preferences"
import { getErrorMessage } from "@/lib/utils"
import { SettingsRow } from "./SettingsRow"

/** "12 KB", "1.4 MB". */
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const BackupSettings = () => {
    const { t, i18n } = useTranslation()
    const [backups, setBackups] = useState<BackupInfo[]>([])
    const [keep, setKeep] = useState(String(DEFAULT_BACKUP_KEEP))
    const [auto, setAuto] = useState(true)
    const [busy, setBusy] = useState(false)
    const [toRestore, setToRestore] = useState<BackupInfo | null>(null)
    const [toDelete, setToDelete] = useState<BackupInfo | null>(null)

    const [error, setError] = useState<string | null>(null)

    // Errors are shown inline in the panel (and logged), not as toasts
    const fail = useCallback((err: unknown, message: string) => {
        reportError(err)
        setError(message)
    }, [])

    const refresh = useCallback(async () => {
        try {
            setBackups(await listBackups())
        } catch (err) {
            fail(err, t("settings.data.backup.errors.list"))
        }
    }, [t, fail])

    useEffect(() => {
        let cancelled = false
        void Promise.all([getBackupKeep(), getAutoBackup()]).then(([storedKeep, storedAuto]) => {
            if (cancelled) return
            setKeep(String(storedKeep))
            setAuto(storedAuto)
        }).catch(error => reportError(error))
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load of the list
        void refresh()
        return () => { cancelled = true }
    }, [refresh])

    const run = async (action: () => Promise<void>, errorMessage: string) => {
        setBusy(true)
        setError(null)
        try {
            await action()
        } catch (err) {
            fail(err, `${errorMessage} ${getErrorMessage(err)}`)
        } finally {
            setBusy(false)
        }
    }

    const backupNow = () => run(async () => {
        await createBackup("manual")
        toast.success(t("settings.data.backup.created"))
        await refresh()
    }, t("settings.data.backup.errors.create"))

    const remove = (backup: BackupInfo) => run(async () => {
        await deleteBackup(backup.name)
        await refresh()
    }, t("settings.data.backup.errors.delete"))

    const restore = (backup: BackupInfo) => run(async () => {
        await restoreBackup(backup.name)
    }, t("settings.data.backup.errors.restore"))

    const openFolder = async () => {
        setError(null)
        try {
            await invoke("open_data_folder", { subfolder: "backups" })
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }

    // The field keeps the raw text while typing; the value is saved as soon as it is a valid number
    const changeKeep = (value: string) => {
        setKeep(value)
        if (value.trim() === "" || !Number.isFinite(Number(value))) return
        void saveBackupKeep(clampBackupKeep(Number(value))).catch(err => fail(err, t("settings.data.backup.errors.save")))
    }

    const normalizeKeep = () => setKeep(String(clampBackupKeep(keep.trim() === "" ? DEFAULT_BACKUP_KEEP : Number(keep))))

    const changeAuto = (value: boolean) => {
        setAuto(value)
        void saveAutoBackup(value).catch(err => fail(err, t("settings.data.backup.errors.save")))
    }

    return (
        <>
            {error && <p role="alert" className="text-xs text-destructive break-words">{error}</p>}
            <SettingsRow label={t("settings.data.backup.now.label")} description={t("settings.data.backup.now.description")}>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void backupNow()}>
                    <DatabaseBackup />
                    {t("settings.data.backup.now.button")}
                </Button>
            </SettingsRow>
            <SettingsRow label={t("settings.data.backup.auto.label")} description={t("settings.data.backup.auto.description")}>
                <Switch aria-label={t("settings.data.backup.auto.label")} checked={auto} onCheckedChange={changeAuto} />
            </SettingsRow>
            <SettingsRow label={t("settings.data.backup.keep.label")} description={t("settings.data.backup.keep.description")}>
                <Input
                    type="number"
                    className="w-20"
                    aria-label={t("settings.data.backup.keep.label")}
                    min={MIN_BACKUP_KEEP}
                    max={MAX_BACKUP_KEEP}
                    value={keep}
                    onChange={event => changeKeep(event.target.value)}
                    onBlur={normalizeKeep}
                />
            </SettingsRow>
            <SettingsRow label={t("settings.data.backup.folder.label")} description={t("settings.data.backup.folder.description")}>
                <Button variant="outline" size="sm" onClick={() => void openFolder()}>
                    <FolderOpen />
                    {t("settings.data.backup.folder.button")}
                </Button>
            </SettingsRow>
            <div className="flex flex-col gap-2">
                <div className="text-sm">{t("settings.data.backup.list.title")}</div>
                {backups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("settings.data.backup.list.empty")}</p>
                ) : (
                    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto" aria-label={t("settings.data.backup.list.title")}>
                        {backups.map(backup => (
                            <li key={backup.name} className="flex items-center justify-between gap-2 text-sm">
                                <span className="min-w-0 truncate">
                                    {backup.date.toLocaleString(i18n.language)}
                                    {backup.preRestore && (
                                        <span className="ml-2 text-xs text-muted-foreground">{t("settings.data.backup.list.preRestore")}</span>
                                    )}
                                    <span className="ml-2 text-xs text-muted-foreground">{formatSize(backup.size)}</span>
                                </span>
                                <span className="shrink-0 flex gap-1">
                                    <TooltipCustom text={t("settings.data.backup.restore.button")}>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={busy}
                                            aria-label={t("settings.data.backup.restore.aria", { date: backup.date.toLocaleString(i18n.language) })}
                                            onClick={() => setToRestore(backup)}
                                        >
                                            <ArchiveRestore />
                                        </Button>
                                    </TooltipCustom>
                                    <TooltipCustom text={t("common.delete")}>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            disabled={busy}
                                            aria-label={t("settings.data.backup.delete.aria", { date: backup.date.toLocaleString(i18n.language) })}
                                            onClick={() => setToDelete(backup)}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </TooltipCustom>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <ConfirmDialog
                open={toDelete !== null}
                onOpenChange={open => { if (!open) setToDelete(null) }}
                destructive
                initialFocus="cancel"
                title={t("settings.data.backup.delete.title")}
                description={t("settings.data.backup.delete.description", { date: toDelete?.date.toLocaleString(i18n.language) ?? "" })}
                confirm={{ label: t("common.delete"), icon: Trash2, onClick: () => { if (toDelete) void remove(toDelete) } }}
            />
            <ConfirmDialog
                open={toRestore !== null}
                onOpenChange={open => { if (!open) setToRestore(null) }}
                destructive
                initialFocus="cancel"
                title={t("settings.data.backup.restore.title")}
                description={t("settings.data.backup.restore.description", { date: toRestore?.date.toLocaleString(i18n.language) ?? "" })}
                confirm={{ label: t("settings.data.backup.restore.confirm"), icon: ArchiveRestore, onClick: () => { if (toRestore) void restore(toRestore) } }}
            />
        </>
    )
}
