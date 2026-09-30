import { KbdKeys } from "@/components/kbd"
import { getShortcut } from "@/lib/shortcuts"

const HINTS = [
    { id: "new-group", label: "Nuovo gruppo o sezione" },
    { id: "search-notes", label: "Cerca una nota" },
    { id: "show-shortcuts", label: "Tutte le scorciatoie" },
].map(h => ({ ...h, keys: getShortcut(h.id).keys }))

export const EmptyNoteHints = () => (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <p className="text-lg">Nota vuota</p>
        {HINTS.map(hint => (
            <p key={hint.id} className="flex items-center gap-2 text-sm">
                {hint.label}
                <KbdKeys keys={hint.keys} />
            </p>
        ))}
    </div>
)
