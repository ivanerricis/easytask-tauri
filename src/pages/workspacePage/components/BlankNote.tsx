import { BoxIcon } from "@/components/box-icon"
import { KbdKeys } from "@/components/kbd"
import { useShortcutKeys } from "@/contexts/shortcuts-context"
import { getShortcut } from "@/lib/shortcuts"

const HINTS = ["search-notes", "new-note", "new-folder", "show-shortcuts"].map(getShortcut)
const LABELS: Record<string, string> = { "show-shortcuts": "Tutte le scorciatoie" }

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
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <BoxIcon className="text-foreground w-20 h-20" />
            <p className="text-2xl">Nessuna nota aperta</p>
            {HINTS.map(hint => (
                <Hint key={hint.id} id={hint.id} label={LABELS[hint.id] ?? hint.description} />
            ))}
        </div>
    )
}
