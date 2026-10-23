import { useEffect, useRef } from "react"

/** Window event fired to show an item in the sidebar tree (the component that owns the tree listens to it). */
export const TREE_REVEAL_EVENT = "easytask:tree-reveal"

export type TreeRevealRef = { type: "folder" | "note", id: number }

/** Asks the sidebar to open, expand the folders above the item and scroll to it. */
export const requestTreeReveal = (ref: TreeRevealRef): void => {
    window.dispatchEvent(new CustomEvent<TreeRevealRef>(TREE_REVEAL_EVENT, { detail: ref }))
}

/**
 * Runs `handler` when a reveal is requested.
 * @category Sidebar
 */
export function useTreeRevealRequest(handler: (ref: TreeRevealRef) => void) {
    const handlerRef = useRef(handler)
    useEffect(() => { handlerRef.current = handler })

    useEffect(() => {
        const onReveal = (event: Event) => handlerRef.current((event as CustomEvent<TreeRevealRef>).detail)
        window.addEventListener(TREE_REVEAL_EVENT, onReveal)
        return () => window.removeEventListener(TREE_REVEAL_EVENT, onReveal)
    }, [])
}
