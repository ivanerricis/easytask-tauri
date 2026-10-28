import { useEffect } from "react"

/**
 * While `active` (an item is being dragged) the whole window shows the closed hand, whatever is under the pointer.
 * With `notAllowed` too (the pointer is over nothing the item can be dropped on) it shows the "not allowed" cursor instead.
 */
export const useGrabbingCursor = (active: boolean, notAllowed = false) => {
    useEffect(() => {
        if (!active) return
        const style = document.createElement("style")
        style.textContent = `*, *::before, *::after { cursor: ${notAllowed ? "not-allowed" : "grabbing"} !important; }`
        document.head.appendChild(style)
        return () => { style.remove() }
    }, [active, notAllowed])
}
