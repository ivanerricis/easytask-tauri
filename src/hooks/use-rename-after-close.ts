import { useCallback, useRef } from "react"

/**
 * The "Rename" entry of an item menu starts the inline edit, but only once the menu has given the focus back,
 * otherwise the input would lose it at once.
 * @returns `requestRename` to call from the entry (after closing the menu) and `onCloseAutoFocus` for the {@link ItemMenu}.
 * @category Hooks
 */
export function useRenameAfterClose(onRename?: () => void) {
    const pending = useRef(false)

    const requestRename = useCallback(() => { pending.current = true }, [])

    const onCloseAutoFocus = useCallback((e: Event) => {
        if (!pending.current) return
        e.preventDefault()
        pending.current = false
        onRename?.()
    }, [onRename])

    return { requestRename, onCloseAutoFocus }
}
