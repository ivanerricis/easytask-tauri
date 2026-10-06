import { useTabsActions } from "@/contexts/use-tabs"
import { useShortcut } from "@/hooks/use-shortcut"

/**
 * Registers the global tab shortcuts once: close the active note, close all the notes (Ctrl/Cmd + L and Ctrl/Cmd + T by default)
 * and move to the next / previous open note (Ctrl/Cmd + PageDown / PageUp, or Ctrl/Cmd + (Shift +) Tab).
 * @category Tabs
 */
export function useTabShortcuts() {
    const { closeActiveNote, closeAllNotes, cycleNote } = useTabsActions()

    useShortcut("close-note", closeActiveNote, { allowInInputs: true })
    useShortcut("close-all-notes", closeAllNotes, { allowInInputs: true })
    useShortcut("next-note", () => cycleNote(1), { allowInInputs: true })
    useShortcut("previous-note", () => cycleNote(-1), { allowInInputs: true })
    useShortcut("next-note-alt", () => cycleNote(1), { allowInInputs: true })
    useShortcut("previous-note-alt", () => cycleNote(-1), { allowInInputs: true })
}
