import { useTabsActions } from "@/contexts/tabs-context"
import { useShortcut } from "@/hooks/use-shortcut"

/**
 * Registers the global tab shortcuts once: close the active note and close all the notes (Ctrl/Cmd + L and Ctrl/Cmd + T by default).
 * @category Tabs
 */
export function useTabShortcuts() {
    const { closeActiveNote, closeAllNotes } = useTabsActions()

    useShortcut("close-note", closeActiveNote, { allowInInputs: true })
    useShortcut("close-all-notes", closeAllNotes, { allowInInputs: true })
}
