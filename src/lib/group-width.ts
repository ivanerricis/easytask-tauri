/** Group widths in pixels (a group without a width set by the user is as wide as its content). */
export const GROUP_MIN_WIDTH = 250
export const GROUP_MAX_WIDTH = 960
/** Below this width the completion bar of the group is hidden: it would not fit the header. */
export const GROUP_PROGRESS_MIN_WIDTH = 320
/** Keyboard step of the resize handle (Shift for the large one). */
const GROUP_KEY_STEP = 16
const GROUP_KEY_STEP_LARGE = 64

export const clampGroupWidth = (width: number): number => {
    if (!Number.isFinite(width)) return GROUP_MIN_WIDTH
    return Math.round(Math.min(Math.max(width, GROUP_MIN_WIDTH), GROUP_MAX_WIDTH))
}

/** The width after a key press on the resize handle, or null when the key is not handled. */
export const groupWidthForKey = (key: string, width: number, shift: boolean): number | null => {
    const step = shift ? GROUP_KEY_STEP_LARGE : GROUP_KEY_STEP
    switch (key) {
        case "ArrowRight": return clampGroupWidth(width + step)
        case "ArrowLeft": return clampGroupWidth(width - step)
        case "Home": return GROUP_MIN_WIDTH
        case "End": return GROUP_MAX_WIDTH
        default: return null
    }
}
