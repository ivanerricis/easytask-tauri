import { useEffect } from "react"

/** While `active` (an item is being dragged) the whole window shows the closed hand, whatever is under the pointer. */
export const useGrabbingCursor = (active: boolean) => {
    useEffect(() => {
        if (!active) return
        const style = document.createElement("style")
        style.textContent = "*, *::before, *::after { cursor: grabbing !important; }"
        document.head.appendChild(style)
        return () => { style.remove() }
    }, [active])
}
