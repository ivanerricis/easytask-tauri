import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@tauri-apps/api/core"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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

    const refresh = useCallback(async () => {
        try {
            setBackups(await listBackups())
        } catch (error) {
            reportError(error, t("settings.data.backup.errors.list"))
        }
    }, [t])

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
        try {
            await action()
        } catch (error) {
            reportError(error, `${errorMessage} ${getErrorMessage(error)}`)
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
        try {
            await invoke("open_data_folder", { subfolder: "backups" })
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    // The field keeps the raw text while typing; the value is saved as soon as it is a valid number
    const changeKeep = (value: string) => {
        setKeep(value)
        if (value.trim() === "" || !Number.isFinite(Number(value))) return
        void saveBackupKeep(clampBackupKeep(Number(value))).catch(error => reportError(error, t("settings.data.backup.errors.save")))
    }

    const normalizeKeep = () => setKeep(String(clampBackupKeep(keep.trim() === "" ? DEFAULT_BACKUP_KEEP : Number(keep))))

    const changeAuto = (value: boolean) => {
        setAuto(value)
        void saveAutoBackup(value).catch(error => reportError(error, t("settings.data.backup.errors.save")))
    }

    return (
        <>
            <SettingsRow label={t("settings.data.backup.now.label")} description={t("settings.data.backup.now.description")}>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void backupNow()}>
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
                                    <Button variant="outline" size="sm" disabled={busy} onClick={() => setToRestore(backup)}>
                                        {t("settings.data.backup.restore.button")}
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void remove(backup)}>
                                        {t("common.delete")}
                                    </Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <AlertDialog open={toRestore !== null} onOpenChange={open => { if (!open) setToRestore(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("settings.data.backup.restore.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("settings.data.backup.restore.description", { date: toRestore?.date.toLocaleString(i18n.language) ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({ variant: "destructive" })}
                            onClick={() => { if (toRestore) void restore(toRestore) }}
                        >
                            {t("settings.data.backup.restore.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
