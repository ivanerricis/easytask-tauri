import { useCallback, useRef } from "react"

/**
 * Runs an action once the menu has given the focus back: an entry that opens an input (rename, new item) must not do it
 * before, or Radix would steal the focus again.
 * @param action What to run after the menu closed (e.g. start the inline edit).
 * @returns `request` to call from the entry (together with closing the menu) and `onCloseAutoFocus` for the {@link ItemMenu}.
 * @category Hooks
 */
export function useAfterMenuClose(action?: () => void) {
    const pending = useRef(false)

    const request = useCallback(() => { pending.current = true }, [])

    const onCloseAutoFocus = useCallback((e: Event) => {
        if (!pending.current) return
        e.preventDefault()
        pending.current = false
        action?.()
    }, [action])

    return { request, onCloseAutoFocus }
}
