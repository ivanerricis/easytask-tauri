import { clampNumber } from "@/lib/number"
import { resizeKeyDelta } from "@/lib/resize-keys"

/** Group widths in pixels (a group without a width set by the user is as wide as its content). */
export const GROUP_MIN_WIDTH = 250
export const GROUP_MAX_WIDTH = 960
/** Below this width the completion bar of the group is hidden: it would not fit the header. */
export const GROUP_PROGRESS_MIN_WIDTH = 320
/** Keyboard step of the resize handle (Shift for the large one). */
const GROUP_KEY_STEP = 16
const GROUP_KEY_STEP_LARGE = 64

export const clampGroupWidth = (width: number): number => {
    return clampNumber(width, GROUP_MIN_WIDTH, GROUP_MAX_WIDTH, GROUP_MIN_WIDTH, 1)
}

/** The width after a key press on the resize handle, or null when the key is not handled. */
export const groupWidthForKey = (key: string, width: number, shift: boolean): number | null => {
    const delta = resizeKeyDelta(key, shift, GROUP_KEY_STEP, GROUP_KEY_STEP_LARGE)
    if (delta === null) return null
    return delta === "min" ? GROUP_MIN_WIDTH : delta === "max" ? GROUP_MAX_WIDTH : clampGroupWidth(width + delta)
}
