import { useTranslation } from "react-i18next"
import { Progress } from "@/components/ui/progress"
import { ReleaseNotes } from "@/components/release-notes"

/** Release notes in a bordered box that scrolls (and can be scrolled with the keyboard): same look in the update dialog and Settings > About. */
export const UpdateNotesBox = ({ body }: { body: string }) => {
    const { t } = useTranslation()
    return (
        <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">{t("settings.about.update.notes")}</div>
            <div
                role="region"
                tabIndex={0}
                aria-label={t("settings.about.update.notes")}
                className="max-h-64 overflow-y-auto rounded-xs border p-2 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                <ReleaseNotes body={body} />
            </div>
        </div>
    )
}

/**
 * Content of the live region shown while an update is installed: the step, the progress bar (animated when the size
 * is unknown, so it does not look stuck) and the hint not to close the app.
 */
export const UpdateInstallProgress = ({ percent, label }: { percent: number | null, label: string | null }) => {
    const { t } = useTranslation()
    return (
        <>
            <p className="text-muted-foreground">{label}</p>
            <Progress
                value={percent}
                aria-label={t("settings.about.update.progressLabel")}
                aria-valuetext={label ?? undefined}
                className={percent === null ? "animate-pulse bg-primary/30" : undefined}
            />
            <p className="text-xs text-muted-foreground">{t("settings.about.update.keepOpenHint")}</p>
        </>
    )
}
