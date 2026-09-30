export type ShortcutCategory = "Generale" | "Note e schede" | "Gruppi, sezioni e task" | "Pagina iniziale"

export interface Shortcut {
    id: string
    keys: string[]
    description: string
    category: ShortcutCategory
}

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = ["Generale", "Note e schede", "Gruppi, sezioni e task", "Pagina iniziale"]

// Documentation only: the handlers live next to the components they act on.
export const SHORTCUTS: Shortcut[] = [
    { id: "show-shortcuts", keys: ["?"], description: "Mostra le scorciatoie", category: "Generale" },
    { id: "go-home", keys: ["Ctrl", "H"], description: "Torna alla Home", category: "Generale" },
    { id: "search-notes", keys: ["Ctrl", "O"], description: "Cerca una nota", category: "Note e schede" },
    { id: "new-note", keys: ["Ctrl", "N"], description: "Crea una nuova nota", category: "Note e schede" },
    { id: "new-folder", keys: ["Ctrl", "M"], description: "Crea una nuova cartella", category: "Note e schede" },
    { id: "close-note", keys: ["Ctrl", "L"], description: "Chiudi la nota attiva", category: "Note e schede" },
    { id: "close-all-notes", keys: ["Ctrl", "T"], description: "Chiudi tutte le note", category: "Note e schede" },
    { id: "new-group", keys: ["Alt", "N"], description: "Crea un nuovo gruppo o una nuova sezione", category: "Gruppi, sezioni e task" },
    { id: "confirm-rename", keys: ["Invio"], description: "Conferma la modifica di nome gruppo, sezione o task", category: "Gruppi, sezioni e task" },
    { id: "cancel-rename", keys: ["Esc"], description: "Annulla la rinomina del gruppo o chiudi il nuovo sottotask", category: "Gruppi, sezioni e task" },
    { id: "task-newline", keys: ["Maiusc", "Invio"], description: "Vai a capo nella descrizione di un task", category: "Gruppi, sezioni e task" },
    { id: "new-workspace", keys: ["Ctrl", "N"], description: "Crea un nuovo workspace", category: "Pagina iniziale" },
]

export const getShortcut = (id: string): Shortcut => {
    const shortcut = SHORTCUTS.find(s => s.id === id)
    if (!shortcut) throw new Error(`Unknown shortcut: ${id}`)
    return shortcut
}
