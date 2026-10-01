import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { getName, getTauriVersion, getVersion } from "@tauri-apps/api/app"
import { ensureAppFolder } from "@/db/appPaths"
import { openUrl } from "@tauri-apps/plugin-opener"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { SettingsPanel } from "./SettingsRow"

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
            <span className="text-muted-foreground shrink-0">Repository</span>
            <span className="flex items-center gap-1.5 text-right">
                <button
                    type="button"
                    onClick={handleOpen}
                    title={t("settings.about.openInBrowser")}
                    className="break-all text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer text-right"
                >
                    {REPO_URL}
                </button>
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={t("settings.about.copyLink")}
                    title={t("settings.about.copyLink")}
                    className="shrink-0 self-center rounded-xs p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                    <Copy className="size-3.5" />
                </button>
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
        </SettingsPanel>
    )
}
