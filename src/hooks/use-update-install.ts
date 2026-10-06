import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { relaunch } from "@tauri-apps/plugin-process"
import type { Update } from "@tauri-apps/plugin-updater"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"

/** Download progress of an update being installed: bytes received and total size (null when unknown). */
export type InstallProgress = { downloaded: number, total: number | null }

/**
 * Downloads and installs an update, then restarts the app (shared by the update dialog and Settings > About).
 * On failure an error toast is shown and `install` resolves to false, so the caller can offer the update again.
 * @returns `progress` (null when nothing is being installed), the derived `percent`/`label` and `install`.
 */
export const useUpdateInstall = () => {
    const { t } = useTranslation()
    const [progress, setProgress] = useState<InstallProgress | null>(null)

    const install = useCallback(async (update: Update): Promise<boolean> => {
        let downloaded = 0
        let total: number | null = null
        setProgress({ downloaded, total })
        try {
            await update.downloadAndInstall(event => {
                if (event.event === "Started") total = event.data.contentLength ?? null
                else if (event.event === "Progress") downloaded += event.data.chunkLength
                setProgress({ downloaded, total })
            })
            await relaunch()
            return true
        } catch (error) {
            setProgress(null)
            reportError(error, t("settings.about.update.installError", { message: getErrorMessage(error) }))
            return false
        }
    }, [t])

    const percent = progress?.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : null
    const label = progress === null
        ? null
        : percent === null
            ? t("settings.about.update.downloadingUnknown")
            : percent >= 100
                ? t("settings.about.update.installing")
                : t("settings.about.update.downloading", { percent })

    return { progress, percent, label, install }
}
