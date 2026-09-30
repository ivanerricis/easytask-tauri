import { BoxIcon } from "@/components/box-icon"
import { KbdKeys } from "@/components/kbd"
import { getShortcut } from "@/lib/shortcuts"

const HINTS = ["search-notes", "new-note", "new-folder", "show-shortcuts"].map(getShortcut)
const LABELS: Record<string, string> = { "show-shortcuts": "Tutte le scorciatoie" }

export const BlankNote = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <BoxIcon className="text-foreground w-20 h-20" />
            <p className="text-2xl">Nessuna nota aperta</p>
            {HINTS.map(hint => (
                <p key={hint.id} className="flex items-center gap-2 text-primary text-lg">
                    {LABELS[hint.id] ?? hint.description}
                    <KbdKeys keys={hint.keys} />
                </p>
            ))}
        </div>
    )
}
