import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Update } from "@tauri-apps/plugin-updater"
import { toast } from "sonner"
import { Download, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { isPortable } from "@/db/appPaths"
import { useUpdateInstall } from "@/hooks/use-update-install"
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

/** Update controls of the About page: manual check, install (installed app) or link to the Releases (portable). */
export const UpdateSection = () => {
    const { t } = useTranslation()
    const [status, setStatus] = useState<Status>({ kind: "idle" })
    const [portable, setPortable] = useState(false)
    const [onStartup, setOnStartup] = useState(true)
    const { progress, percent, label: installLabel, install } = useUpdateInstall()

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
            // The plugin reports a missing or unreachable latest.json (no published release, or offline) in English
            const message = getErrorMessage(error)
            setStatus({ kind: "error", message: /valid release json/i.test(message) ? t("settings.about.update.noRelease") : message })
        }
    }

    const handleInstall = async (update: Update) => {
        // On success the app restarts; on failure the hook shows the error and the update stays offered
        await install(update)
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

    const installing = progress !== null
    const busy = status.kind === "checking" || installing

    return (
        <div className="flex flex-col gap-3">
            <SettingsRow label={t("settings.about.update.label")}>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleCheck()}>
                    <RefreshCw />
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
                {status.kind === "available" && !installing && (
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
                                        <ExternalLink />
                                        {t("settings.about.update.openReleases")}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div>
                                <Button size="sm" onClick={() => void handleInstall(status.update)}>
                                    <Download />
                                    {t("settings.about.update.install")}
                                </Button>
                            </div>
                        )}
                    </>
                )}
                {installing && (
                    <>
                        <p className="text-muted-foreground">{installLabel}</p>
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
