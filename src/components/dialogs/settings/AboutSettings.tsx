import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { getName, getTauriVersion, getVersion } from "@tauri-apps/api/app"
import { ensureAppFolder } from "@/db/appPaths"
import { openUrl } from "@tauri-apps/plugin-opener"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { SettingsPanel } from "./SettingsRow"
import { UpdateSection } from "./UpdateSection"

const REPO_URL = "https://github.com/ivanerricis/easytask-tauri"
const DB_FILE = "easytask.db"
const EMPTY = "—"

type AboutInfo = { name: string, version: string, tauri: string, dbPath: string }

const settle = async (fn: () => Promise<string>) => {
    try {
        return (await fn()) || EMPTY
    } catch {
        return EMPTY
    }
}

const InfoRow = ({ label, value, selectable }: { label: string, value: string, selectable?: boolean }) => (
    <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className={`text-right break-all ${selectable ? "select-text" : ""}`}>{value}</span>
    </div>
)

const RepositoryRow = () => {
    const { t } = useTranslation()
    const handleOpen = async () => {
        try {
            await openUrl(REPO_URL)
        } catch (err) {
            toast.error(t("settings.about.openError", { message: getErrorMessage(err) }))
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(REPO_URL)
            toast.success(t("settings.about.copied"))
        } catch (err) {
            toast.error(t("settings.about.copyError", { message: getErrorMessage(err) }))
        }
    }

    return (
        <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">{t("settings.about.repository")}</span>
            <span className="flex items-center gap-1.5 text-right">
                <TooltipCustom text={t("settings.about.openInBrowser")}>
                    <Button
                        type="button"
                        variant="link"
                        onClick={handleOpen}
                        className="h-auto whitespace-normal p-0 text-right font-normal break-all text-foreground underline decoration-primary"
                    >
                        {REPO_URL}
                    </Button>
                </TooltipCustom>
                <TooltipCustom text={t("settings.about.copyLink")}>
                    <Button type="button" variant="ghost" size="icon" onClick={handleCopy} aria-label={t("settings.about.copyLink")} className="self-center text-muted-foreground">
                        <Copy />
                    </Button>
                </TooltipCustom>
            </span>
        </div>
    )
}

export const AboutSettings = () => {
    const { t } = useTranslation()
    const [info, setInfo] = useState<AboutInfo>({ name: EMPTY, version: EMPTY, tauri: EMPTY, dbPath: EMPTY })

    useEffect(() => {
        let cancelled = false
        Promise.all([
            settle(getName),
            settle(getVersion),
            settle(getTauriVersion),
            settle(async () => {
                const dir = await ensureAppFolder()
                const sep = dir.includes("\\") ? "\\" : "/"
                return `${dir}${sep}${DB_FILE}`
            }),
        ]).then(([name, version, tauri, dbPath]) => {
            if (!cancelled) setInfo({ name, version, tauri, dbPath })
        })
        return () => { cancelled = true }
    }, [])

    return (
        <SettingsPanel title={t("settings.about.title")}>
            <p className="text-sm text-muted-foreground">
                {t("settings.about.description")}
            </p>
            <div className="flex flex-col gap-2">
                <InfoRow label={t("settings.about.application")} value={info.name} />
                <InfoRow label={t("settings.about.version")} value={info.version} />
                <InfoRow label={t("settings.about.tauriVersion")} value={info.tauri} />
                <InfoRow label={t("settings.about.author")} value="Ivan Erricis" />
                <RepositoryRow />
                <InfoRow label={t("settings.about.database")} value={info.dbPath} selectable />
            </div>
            <UpdateSection />
        </SettingsPanel>
    )
}
