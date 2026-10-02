import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Update } from "@tauri-apps/plugin-updater"
import { toast } from "sonner"
import { Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { ReleaseNotes } from "@/components/release-notes"
import { useUpdateInstall } from "@/hooks/use-update-install"
import { reportError } from "@/lib/report-error"
import { saveSkippedUpdateVersion } from "@/lib/store/preferences"
import { openReleasesPage, UPDATE_AVAILABLE_EVENT, type UpdateAvailableDetail } from "@/lib/updater"
import { getErrorMessage } from "@/lib/utils"

/** True while another dialog (settings, confirmation...) is open: the update dialog waits for it to close. */
const otherDialogOpen = () => document.querySelector('[role="dialog"]') !== null

/**
 * Update dialog opened by the startup check ({@link UPDATE_AVAILABLE_EVENT}): what's new, then "Update now"
 * (download, install and restart; "Open the Releases page" for the portable app), "Later" (offered again at the
 * next start) or "Skip this version" (not offered again until a newer one is out).
 */
export const DialogUpdate = () => {
    const { t } = useTranslation()
    const [pending, setPending] = useState<UpdateAvailableDetail | null>(null)
    const [open, setOpen] = useState(false)
    const { progress, percent, label, install } = useUpdateInstall()
    const installing = progress !== null

    useEffect(() => {
        const handler = (event: Event) => {
            setPending((event as CustomEvent<UpdateAvailableDetail>).detail)
            if (!otherDialogOpen()) setOpen(true)
        }
        window.addEventListener(UPDATE_AVAILABLE_EVENT, handler)
        return () => window.removeEventListener(UPDATE_AVAILABLE_EVENT, handler)
    }, [])

    // Another dialog was open when the update arrived: open as soon as it closes
    useEffect(() => {
        if (!pending || open) return
        const tryOpen = () => {
            if (otherDialogOpen()) return
            observer.disconnect()
            setOpen(true)
        }
        const observer = new MutationObserver(tryOpen)
        observer.observe(document.body, { childList: true, subtree: true })
        // It may have closed between the event and this effect
        const timer = window.setTimeout(tryOpen, 0)
        return () => {
            observer.disconnect()
            window.clearTimeout(timer)
        }
    }, [pending, open])

    if (!pending) return null
    const { update, portable } = pending

    const close = () => {
        setOpen(false)
        setPending(null)
    }

    const handleOpenChange = (value: boolean) => {
        // The download cannot be interrupted: the dialog stays open until the app restarts (or the install fails)
        if (!value && !installing) close()
    }

    const handleSkip = () => {
        void saveSkippedUpdateVersion(update.version).catch(error => reportError(error))
        close()
    }

    const handleUpdate = async (target: Update) => {
        if (portable) {
            try {
                await openReleasesPage()
            } catch (error) {
                toast.error(t("settings.about.openError", { message: getErrorMessage(error) }))
            }
            return
        }
        await install(target)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent showCloseButton={!installing} className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("settings.about.update.dialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("settings.about.update.dialog.description", { version: update.version, current: update.currentVersion })}
                    </DialogDescription>
                </DialogHeader>

                {update.body?.trim() && (
                    <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground">{t("settings.about.update.notes")}</div>
                        <div className="max-h-64 overflow-y-auto rounded-xs border p-2">
                            <ReleaseNotes body={update.body} />
                        </div>
                    </div>
                )}
                {portable && <p className="text-xs text-muted-foreground">{t("settings.about.update.portableHint")}</p>}

                {installing && (
                    <div role="status" aria-live="polite" className="flex flex-col gap-2 text-sm">
                        <p className="text-muted-foreground">{label}</p>
                        <Progress value={percent ?? 0} aria-label={t("settings.about.update.label")} />
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" disabled={installing} onClick={handleSkip}>
                        {t("settings.about.update.dialog.skip")}
                    </Button>
                    <Button variant="outline" disabled={installing} onClick={close}>
                        {t("settings.about.update.dialog.later")}
                    </Button>
                    <Button disabled={installing} onClick={() => void handleUpdate(update)}>
                        {portable ? <ExternalLink /> : <Download />}
                        {portable ? t("settings.about.update.openReleases") : t("settings.about.update.dialog.updateNow")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
