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
    const handleOpen = async () => {
        try {
            await openUrl(REPO_URL)
        } catch (err) {
            toast.error("Impossibile aprire il link - " + getErrorMessage(err))
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(REPO_URL)
            toast.success("Link copiato")
        } catch (err) {
            toast.error("Impossibile copiare il link - " + getErrorMessage(err))
        }
    }

    return (
        <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">Repository</span>
            <span className="flex items-center gap-1.5 text-right">
                <button
                    type="button"
                    onClick={handleOpen}
                    title="Apri nel browser"
                    className="break-all text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer text-right"
                >
                    {REPO_URL}
                </button>
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copia link"
                    title="Copia link"
                    className="shrink-0 self-center rounded-xs p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                >
                    <Copy className="size-3.5" />
                </button>
            </span>
        </div>
    )
}

export const AboutSettings = () => {
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
        <SettingsPanel title="Informazioni">
            <p className="text-sm text-muted-foreground">
                EasyTask è una todo list avanzata basata su Workspace, ispirata a sistemi come
                Notion, Obsidian e Trello. Organizza cartelle, note, sezioni e task annidati,
                con colori personalizzabili e drag &amp; drop.
            </p>
            <div className="flex flex-col gap-2">
                <InfoRow label="Applicazione" value={info.name} />
                <InfoRow label="Versione" value={info.version} />
                <InfoRow label="Versione Tauri" value={info.tauri} />
                <InfoRow label="Autore" value="Ivan Erricis" />
                <RepositoryRow />
                <InfoRow label="Database" value={info.dbPath} selectable />
            </div>
        </SettingsPanel>
    )
}
