import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { relaunch } from "@tauri-apps/plugin-process"
import type { Update } from "@tauri-apps/plugin-updater"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { isPortable } from "@/db/appPaths"
import { reportError } from "@/lib/report-error"
import { getCheckUpdatesOnStartup, saveCheckUpdatesOnStartup } from "@/lib/store/preferences"
import { checkForUpdate, openReleasesPage } from "@/lib/updater"
import { getErrorMessage } from "@/lib/utils"
import { SettingsRow } from "./SettingsRow"

type Status =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "upToDate" }
    | { kind: "available", update: Update }
    | { kind: "error", message: string }
    | { kind: "installing", downloaded: number, total: number | null }

/** Update controls of the About page: manual check, install (installed app) or link to the Releases (portable). */
export const UpdateSection = () => {
    const { t } = useTranslation()
    const [status, setStatus] = useState<Status>({ kind: "idle" })
    const [portable, setPortable] = useState(false)
    const [onStartup, setOnStartup] = useState(true)

    useEffect(() => {
        let cancelled = false
        void isPortable().then(value => { if (!cancelled) setPortable(value) }).catch(() => undefined)
        void getCheckUpdatesOnStartup().then(value => { if (!cancelled) setOnStartup(value) }).catch(error => reportError(error))
        return () => { cancelled = true }
    }, [])

    const handleCheck = async () => {
        setStatus({ kind: "checking" })
        try {
            const update = await checkForUpdate()
            setStatus(update ? { kind: "available", update } : { kind: "upToDate" })
        } catch (error) {
            setStatus({ kind: "error", message: getErrorMessage(error) })
        }
    }

    const handleInstall = async (update: Update) => {
        let downloaded = 0
        let total: number | null = null
        setStatus({ kind: "installing", downloaded, total })
        try {
            await update.downloadAndInstall(event => {
                if (event.event === "Started") total = event.data.contentLength ?? null
                else if (event.event === "Progress") downloaded += event.data.chunkLength
                setStatus({ kind: "installing", downloaded, total })
            })
            await relaunch()
        } catch (error) {
            setStatus({ kind: "available", update })
            toast.error(t("settings.about.update.installError", { message: getErrorMessage(error) }))
        }
    }

    const handleOpenReleases = async () => {
        try {
            await openReleasesPage()
        } catch (error) {
            toast.error(t("settings.about.openError", { message: getErrorMessage(error) }))
        }
    }

    const handleStartupChange = (value: boolean) => {
        setOnStartup(value)
        void saveCheckUpdatesOnStartup(value).catch(error => reportError(error, getErrorMessage(error)))
    }

    const busy = status.kind === "checking" || status.kind === "installing"
    const percent = status.kind === "installing" && status.total
        ? Math.min(100, Math.round((status.downloaded / status.total) * 100))
        : null

    return (
        <div className="flex flex-col gap-3">
            <SettingsRow label={t("settings.about.update.label")}>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleCheck()}>
                    {t("settings.about.update.checkButton")}
                </Button>
            </SettingsRow>

            <div role="status" aria-live="polite" className="flex flex-col gap-2 text-sm">
                {status.kind === "checking" && (
                    <p className="text-muted-foreground">{t("settings.about.update.checking")}</p>
                )}
                {status.kind === "upToDate" && (
                    <p className="text-muted-foreground">{t("settings.about.update.upToDate")}</p>
                )}
                {status.kind === "error" && (
                    <p className="text-destructive break-words">
                        {t("settings.about.update.error", { message: status.message })}
                    </p>
                )}
                {status.kind === "available" && (
                    <>
                        <p>{t("settings.about.update.available", { version: status.update.version })}</p>
                        {status.update.body && (
                            <div>
                                <div className="text-xs text-muted-foreground">{t("settings.about.update.notes")}</div>
                                <p className="whitespace-pre-wrap text-xs select-text max-h-32 overflow-y-auto">{status.update.body}</p>
                            </div>
                        )}
                        {portable ? (
                            <>
                                <p className="text-xs text-muted-foreground">{t("settings.about.update.portableHint")}</p>
                                <div>
                                    <Button size="sm" onClick={() => void handleOpenReleases()}>
                                        {t("settings.about.update.openReleases")}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div>
                                <Button size="sm" onClick={() => void handleInstall(status.update)}>
                                    {t("settings.about.update.install")}
                                </Button>
                            </div>
                        )}
                    </>
                )}
                {status.kind === "installing" && (
                    <>
                        <p className="text-muted-foreground">
                            {percent === null
                                ? t("settings.about.update.downloadingUnknown")
                                : percent >= 100
                                    ? t("settings.about.update.installing")
                                    : t("settings.about.update.downloading", { percent })}
                        </p>
                        <Progress value={percent ?? 0} aria-label={t("settings.about.update.label")} />
                    </>
                )}
            </div>

            <SettingsRow label={t("settings.about.update.startup.label")} description={t("settings.about.update.startup.description")}>
                <Switch
                    aria-label={t("settings.about.update.startup.label")}
                    checked={onStartup}
                    onCheckedChange={handleStartupChange}
                />
            </SettingsRow>
        </div>
    )
}
