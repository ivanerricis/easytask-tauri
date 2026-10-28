import { useEffect, useRef } from "react"
import { useTabsActions } from "@/contexts/use-tabs"
import { useLayout, useLayoutActions } from "@/contexts/use-layout"
import { useShortcut } from "@/hooks/use-shortcut"

/**
 * Registers the global tab shortcuts once: close the active note, close all the notes (Ctrl/Cmd + L and Ctrl/Cmd + T by default),
 * move to the next / previous open note (Ctrl/Cmd + PageDown / PageUp, or Ctrl/Cmd + (Shift +) Tab) and the split workspace ones:
 * split / close the split, move the active note to the other pane, focus the other pane.
 * @category Tabs
 */
export function useTabShortcuts() {
    const { closeActiveNote, closeAllNotes, cycleNote } = useTabsActions()
    const layout = useLayout()
    const { toggleSplit, focusPane, openInPane, moveToPane } = useLayoutActions()

    // The handlers read the layout at call time through a ref, so the shortcuts are not re-registered on every tab change
    const layoutRef = useRef(layout)
    useEffect(() => { layoutRef.current = layout }, [layout])

    const moveActiveToOtherPane = () => {
        const { left, right, focused } = layoutRef.current
        const activeId = (focused === 1 ? right : left)?.activeId ?? null
        if (activeId === null) return
        if (focused === 1) moveToPane(activeId, 0)
        else openInPane(activeId, 1)
    }

    const focusOtherPane = () => {
        const { isSplit, focused } = layoutRef.current
        if (isSplit) focusPane(focused === 0 ? 1 : 0)
    }

    useShortcut("close-note", closeActiveNote, { allowInInputs: true })
    useShortcut("close-all-notes", closeAllNotes, { allowInInputs: true })
    useShortcut("next-note", () => cycleNote(1), { allowInInputs: true })
    useShortcut("previous-note", () => cycleNote(-1), { allowInInputs: true })
    useShortcut("next-note-alt", () => cycleNote(1), { allowInInputs: true })
    useShortcut("previous-note-alt", () => cycleNote(-1), { allowInInputs: true })
    useShortcut("toggle-split", toggleSplit, { allowInInputs: true })
    useShortcut("move-note-to-other-pane", moveActiveToOtherPane, { allowInInputs: true })
    useShortcut("move-note-to-other-pane-alt", moveActiveToOtherPane, { allowInInputs: true })
    useShortcut("focus-other-pane", focusOtherPane, { allowInInputs: true })
}
