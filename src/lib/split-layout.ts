import { clampNumber, isFiniteNumber } from "@/lib/number"
import { resizeKeyDelta } from "@/lib/resize-keys"

/** Minimum width in pixels of each pane of the split workspace. */
export const MIN_PANE_WIDTH = 320
/** Share of the width given to the left pane by default. */
export const DEFAULT_SPLIT_RATIO = 0.5
/** Without a measured width the ratio is kept at least this far from the edges. */
const FALLBACK_MARGIN = 0.1
/** Keyboard step of the divider (Shift for the large one), as a share of the width. */
const KEY_STEP = 0.02
const KEY_STEP_LARGE = 0.1

/** The smallest share the left pane may take (the largest is its complement) for the given container width. */
const minRatioFor = (containerWidth: number): number => {
    if (!isFiniteNumber(containerWidth) || containerWidth <= 0) return FALLBACK_MARGIN
    return Math.min(0.5, MIN_PANE_WIDTH / containerWidth)
}

/**
 * Brings the share of the left pane into the allowed range: each pane keeps at least MIN_PANE_WIDTH pixels
 * (when the container is too narrow for two panes the divider stays in the middle). Non-numbers give the default.
 * @param ratio Share of the container width given to the left pane (0-1).
 * @param containerWidth Width in pixels of the container of the two panes.
 */
export const clampRatio = (ratio: number, containerWidth: number): number => {
    const min = minRatioFor(containerWidth)
    return clampNumber(ratio, min, 1 - min, DEFAULT_SPLIT_RATIO, 0.0001)
}

/**
 * The ratio after a key press on the divider, or null when the key is not handled.
 * Arrows move it by 2% (10% with Shift), Home and End send it to the extremes.
 */
export const ratioForKey = (key: string, ratio: number, containerWidth: number, shift: boolean): number | null => {
    const delta = resizeKeyDelta(key, shift, KEY_STEP, KEY_STEP_LARGE)
    if (delta === null) return null
    return clampRatio(delta === "min" ? 0 : delta === "max" ? 1 : ratio + delta, containerWidth)
}
