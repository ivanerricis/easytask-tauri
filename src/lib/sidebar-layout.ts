import { useEffect, useState } from "react"

/** Sidebar widths in pixels. */
export const SIDEBAR_DEFAULT_WIDTH = 260
export const SIDEBAR_MIN_WIDTH = 200
export const SIDEBAR_MAX_WIDTH = 480
/** Keyboard step of the resizer (Shift for the large one). */
export const SIDEBAR_KEY_STEP = 16
export const SIDEBAR_KEY_STEP_LARGE = 64
/** Below this window width the sidebar becomes a collapsible overlay. */
export const COMPACT_BREAKPOINT = 900
/** Room always left to the note next to the sidebar (rail included). */
const MIN_CONTENT_WIDTH = 420

/** The largest width allowed at the given window width (never below the minimum). */
export const maxSidebarWidth = (windowWidth: number): number =>
    Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, windowWidth - MIN_CONTENT_WIDTH))

export const clampSidebarWidth = (width: number, windowWidth: number = Infinity): number => {
    if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH
    return Math.round(Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), maxSidebarWidth(windowWidth)))
}

/**
 * The width after a key press on the resizer, or null when the key is not handled.
 * `direction` is 1 when the sidebar grows to the right (left sidebar), -1 for a right sidebar.
 */
export const widthForKey = (key: string, width: number, windowWidth: number, shift: boolean, direction: 1 | -1 = 1): number | null => {
    const step = shift ? SIDEBAR_KEY_STEP_LARGE : SIDEBAR_KEY_STEP
    switch (key) {
        case "ArrowRight": return clampSidebarWidth(width + step * direction, windowWidth)
        case "ArrowLeft": return clampSidebarWidth(width - step * direction, windowWidth)
        case "Home": return SIDEBAR_MIN_WIDTH
        case "End": return maxSidebarWidth(windowWidth)
        default: return null
    }
}

/** True while the window is narrower than the compact breakpoint. */
export function useCompactLayout(): boolean {
    const [compact, setCompact] = useState(() => window.innerWidth < COMPACT_BREAKPOINT)
    useEffect(() => {
        const update = () => setCompact(window.innerWidth < COMPACT_BREAKPOINT)
        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [])
    return compact
}
