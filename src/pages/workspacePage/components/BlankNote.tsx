import { useTranslation } from "react-i18next"
import { BoxIcon } from "@/components/box-icon"
import { KbdKeys } from "@/components/kbd"
import { useShortcutKeys } from "@/contexts/use-shortcuts"
import { getShortcut, shortcutDescription } from "@/lib/shortcuts"

const HINTS = ["search-notes", "new-note", "new-folder", "show-shortcuts"].map(getShortcut)

const Hint = ({ id, label }: { id: string, label: string }) => {
    const keys = useShortcutKeys(id)
    return (
        <p className="flex items-center gap-2 text-primary text-lg">
            {label}
            <KbdKeys keys={keys} />
        </p>
    )
}

export const BlankNote = () => {
    const { t } = useTranslation()
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <BoxIcon className="text-foreground w-20 h-20" />
            <p className="text-2xl">{t("notes.blank.title")}</p>
            {HINTS.map(hint => (
                <Hint key={hint.id} id={hint.id} label={hint.id === "show-shortcuts" ? t("notes.hints.allShortcuts") : shortcutDescription(hint.id)} />
            ))}
        </div>
    )
}
