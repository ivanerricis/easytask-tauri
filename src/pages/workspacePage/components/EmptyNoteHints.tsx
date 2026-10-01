import { useTranslation } from "react-i18next"
import { KbdKeys } from "@/components/kbd"
import { useShortcutKeys } from "@/contexts/use-shortcuts"

const HINTS = [
    { id: "new-group", labelKey: "notes.hints.newGroup" },
    { id: "search-notes", labelKey: "notes.hints.search" },
    { id: "show-shortcuts", labelKey: "notes.hints.allShortcuts" },
] as const

const Hint = ({ id, labelKey }: { id: string, labelKey: (typeof HINTS)[number]["labelKey"] }) => {
    const { t } = useTranslation()
    const keys = useShortcutKeys(id)
    return (
        <p className="flex items-center gap-2 text-sm">
            {t(labelKey)}
            <KbdKeys keys={keys} />
        </p>
    )
}

export const EmptyNoteHints = () => {
    const { t } = useTranslation()
    return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <p className="text-lg">{t("notes.empty.title")}</p>
        {HINTS.map(hint => <Hint key={hint.id} {...hint} />)}
    </div>
    )
}
