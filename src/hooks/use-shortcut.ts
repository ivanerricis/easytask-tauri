import { useEffect, useRef } from "react"
import { useShortcutsContext } from "@/contexts/use-shortcuts"
import { usePaneFocusGetter } from "@/contexts/use-layout"
import { type ShortcutEntry } from "@/contexts/shortcuts-context-object"

type UseShortcutOptions = {
    enabled?: boolean
    // Fire even when the event comes from an input, textarea, select or contenteditable
    allowInInputs?: boolean
}

/**
 * Runs `handler` when the effective binding of the shortcut `id` is pressed.
 * Inside a pane the handler runs only while that pane has the focus (so a handler registered once per pane fires once).
 * The provider owns the single keydown listener; the event is preventDefault-ed when handled.
 * @category Shortcuts
 */
export function useShortcut(id: string, handler: (e: KeyboardEvent) => void, { enabled = true, allowInInputs = false }: UseShortcutOptions = {}) {
    const { register } = useShortcutsContext()
    const isFocused = usePaneFocusGetter()
    const entry = useRef<ShortcutEntry>({ handler, enabled, allowInInputs, isFocused })

    // Kept fresh on every render so the registration never has to change
    useEffect(() => {
        entry.current = { handler, enabled, allowInInputs, isFocused }
    })

    useEffect(() => register(id, entry), [id, register])
}
