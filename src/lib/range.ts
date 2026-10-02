import type { CSSProperties } from "react"

/**
 * Style of a range input: sets --range-progress (0 to 1), which the slider styles in index.css use to fill the track
 * up to the thumb. Pass it as the `style` of every `<input type="range">`.
 * @param value Current value.
 * @param min Minimum of the range.
 * @param max Maximum of the range (a range without a length, e.g. a track whose duration is not known yet, is empty).
 */
export const rangeStyle = (value: number, min: number, max: number): CSSProperties => {
    const progress = Number.isFinite(value) && Number.isFinite(max) && max > min ? (value - min) / (max - min) : 0
    return { "--range-progress": Math.min(Math.max(progress, 0), 1) } as CSSProperties
}
