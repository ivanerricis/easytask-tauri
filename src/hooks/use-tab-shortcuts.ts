import { useEffect } from "react"
import { useTabsActions } from "@/contexts/tabs-context"

/**
 * Registers the global tab shortcuts once: Ctrl/Cmd + L closes the active note, Ctrl/Cmd + T closes all the notes.
 * @category Tabs
 */
export function useTabShortcuts() {
    const { closeActiveNote, closeAllNotes } = useTabsActions()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return
            if (e.key === "l") {
                e.preventDefault()
                closeActiveNote()
            } else if (e.key === "t") {
                e.preventDefault()
                closeAllNotes()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [closeActiveNote, closeAllNotes])
}
