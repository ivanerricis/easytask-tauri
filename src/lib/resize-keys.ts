/**
 * What a key press on a resize handle does: a delta (negative = towards the left/start) to add to the current size,
 * "min" or "max" (Home, End), or null when the key is not handled.
 * @param smallStep Delta of an arrow key.
 * @param largeStep Delta of an arrow key with Shift.
 */
export const resizeKeyDelta = (key: string, shift: boolean, smallStep: number, largeStep: number): number | "min" | "max" | null => {
    const step = shift ? largeStep : smallStep
    switch (key) {
        case "ArrowRight": return step
        case "ArrowLeft": return -step
        case "Home": return "min"
        case "End": return "max"
        default: return null
    }
}
