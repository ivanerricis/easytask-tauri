import { useEffect, useState } from "react"
import { MIN_PANE_WIDTH } from "@/lib/split-layout"
import { clampNumber } from "@/lib/number"
import { resizeKeyDelta } from "@/lib/resize-keys"

/** Sidebar widths in pixels. */
export const SIDEBAR_DEFAULT_WIDTH = 260
export const SIDEBAR_MIN_WIDTH = 224
export const SIDEBAR_MAX_WIDTH = 480
/** Keyboard step of the resizer (Shift for the large one). */
const SIDEBAR_KEY_STEP = 16
const SIDEBAR_KEY_STEP_LARGE = 64
/** Below this window width the sidebar becomes a collapsible overlay. */
export const COMPACT_BREAKPOINT = 900
/** Minimum height of the strip at the top of the panels (sidebar header, right panel tabs, note tabs): they all line up. */
export const CHROME_HEIGHT_CLASS = "min-h-[42px]"
/** Room always left to the note next to the sidebar (rail included). */
export const MIN_CONTENT_WIDTH = 420
/** Room always left to the centre with the given number of panes: each pane of a split keeps its own minimum. */
export const minContentWidth = (panes: number = 1): number => Math.max(MIN_CONTENT_WIDTH, Math.max(1, Math.floor(panes)) * MIN_PANE_WIDTH)

/** Width of the little sidebar (rail) that stays visible next to each panel. */
export const SIDEBAR_RAIL_WIDTH = 45

/** The largest width allowed at the given window width (never below the minimum). */
export const maxSidebarWidth = (windowWidth: number): number =>
    Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, windowWidth - MIN_CONTENT_WIDTH))

export const clampSidebarWidth = (width: number, windowWidth: number = Infinity): number => {
    return clampNumber(width, SIDEBAR_MIN_WIDTH, maxSidebarWidth(windowWidth), SIDEBAR_DEFAULT_WIDTH, 1)
}

/**
 * The width after a key press on the resizer, or null when the key is not handled.
 * `direction` is 1 when the sidebar grows to the right (left sidebar), -1 for a right sidebar.
 */
export const widthForKey = (key: string, width: number, windowWidth: number, shift: boolean, direction: 1 | -1 = 1): number | null => {
    const delta = resizeKeyDelta(key, shift, SIDEBAR_KEY_STEP, SIDEBAR_KEY_STEP_LARGE)
    if (delta === null) return null
    return delta === "min" ? SIDEBAR_MIN_WIDTH : delta === "max" ? maxSidebarWidth(windowWidth) : clampSidebarWidth(width + delta * direction, windowWidth)
}

type SidebarState = { open: boolean, width: number }

/** Width left to the note with the given sidebars (both rails are always there). */
export const noteWidthFor = (windowWidth: number, left: SidebarState, right: SidebarState): number =>
    windowWidth - 2 * SIDEBAR_RAIL_WIDTH
    - (left.open ? clampSidebarWidth(left.width) : 0)
    - (right.open ? clampSidebarWidth(right.width) : 0)

/**
 * Which open sidebars must close for the note to keep at least MIN_CONTENT_WIDTH: the right one first, then the left one,
 * until the note fits (or nothing is left open). With `panes` panes side by side (default 1) the minimum is that of the panes together.
 */
export const sidebarsToClose = (windowWidth: number, left: SidebarState, right: SidebarState, panes: number = 1): { left: boolean, right: boolean } => {
    const l = left
    let r = right
    const closed = { left: false, right: false }
    const minimum = minContentWidth(panes)
    if (noteWidthFor(windowWidth, l, r) < minimum && r.open) {
        r = { ...r, open: false }
        closed.right = true
    }
    if (noteWidthFor(windowWidth, l, r) < minimum && l.open) {
        closed.left = true
    }
    return closed
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


