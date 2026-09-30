import { KbdKeys } from "@/components/kbd"
import { useShortcutKeys } from "@/contexts/use-shortcuts"

const HINTS = [
    { id: "new-group", label: "Nuovo gruppo o sezione" },
    { id: "search-notes", label: "Cerca una nota" },
    { id: "show-shortcuts", label: "Tutte le scorciatoie" },
]

const Hint = ({ id, label }: { id: string, label: string }) => {
    const keys = useShortcutKeys(id)
    return (
        <p className="flex items-center gap-2 text-sm">
            {label}
            <KbdKeys keys={keys} />
        </p>
    )
}

export const EmptyNoteHints = () => (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <p className="text-lg">Nota vuota</p>
        {HINTS.map(hint => <Hint key={hint.id} {...hint} />)}
    </div>
)
