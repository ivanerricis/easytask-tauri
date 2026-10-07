import { Briefcase, FileText, Folder, Layers, LayoutList, LayoutTemplate, Music, SquareCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { formatDate } from "@/lib/utils"

/** Icon of every kind of item listed by the trash and the archive dialogs. */
export const ITEM_ICONS = {
    workspace: Briefcase,
    folder: Folder,
    note: FileText,
    section_group: Layers,
    section: LayoutList,
    task: SquareCheck,
    audio_file: Music,
    note_template: LayoutTemplate,
} satisfies Record<string, LucideIcon>

/** "YYYY-MM-DD HH:MM:SS" -> date in the current language + "HH:MM". */
export const formatStoredDate = (value: string) => {
    if (!value) return ""
    const [date, time] = value.split(" ")
    return time ? `${formatDate(date)} ${time.slice(0, 5)}` : formatDate(date)
}

/** Ids of the tab and of the panel of a kind of item (aria-controls / aria-labelledby). */
export const typeTabId = (prefix: string, type: string) => `${prefix}-tab-${type}`
export const typePanelId = (prefix: string, type: string) => `${prefix}-panel-${type}`
