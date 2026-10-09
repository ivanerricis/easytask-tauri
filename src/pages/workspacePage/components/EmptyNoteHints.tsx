import { useTranslation } from "react-i18next"
import { EmptyNoteIcon } from "@/components/empty-note-icon"
import { EmptyState } from "./EmptyState"

const HINTS = [
    { id: "new-group", labelKey: "notes.hints.newGroup" },
    { id: "search-notes", labelKey: "notes.hints.search" },
    { id: "show-shortcuts", labelKey: "notes.hints.allShortcuts" },
] as const

/** Laid over an open note without groups, like the "no note open" screen (it never takes the clicks of the note). */
export const EmptyNoteHints = () => {
    const { t } = useTranslation()
    return (
        <EmptyState
            icon={EmptyNoteIcon}
            title={t("notes.empty.title")}
            hints={HINTS.map(hint => ({ id: hint.id, label: t(hint.labelKey) }))}
            className="pointer-events-none absolute inset-0"
        />
    )
}
