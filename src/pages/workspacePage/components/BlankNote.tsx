import { useTranslation } from "react-i18next"
import { BoxIcon } from "@/components/box-icon"
import { shortcutDescription } from "@/lib/shortcuts"
import { EmptyState } from "./EmptyState"

const HINTS = ["search-notes", "new-note", "new-folder", "show-shortcuts"]

export const BlankNote = () => {
    const { t } = useTranslation()
    return (
        <EmptyState
            icon={BoxIcon}
            title={t("notes.blank.title")}
            hints={HINTS.map(id => ({ id, label: id === "show-shortcuts" ? t("notes.hints.allShortcuts") : shortcutDescription(id) }))}
        />
    )
}
