/** True for a number that is neither NaN nor infinite. */
export const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

/**
 * Brings a value into [min, max], optionally rounded to a multiple of `step`.
 * The value is clamped first and rounded after (with bounds on the `step` grid the order does not matter).
 * @param value Anything: what is not a finite number gives `fallback`.
 * @param step Rounding step (e.g. 1 for whole numbers, 0.01 for percentages); omitted = no rounding.
 */
export const clampNumber = (value: unknown, min: number, max: number, fallback: number, step?: number): number => {
    if (!isFiniteNumber(value)) return fallback
    const clamped = Math.min(max, Math.max(min, value))
    if (!step) return clamped
    if (step >= 1) return Math.round(clamped / step) * step
    const inverse = Math.round(1 / step)
    return Math.round(clamped * inverse) / inverse
}

/** Brings an index into 0..length (the insertion points of a list); fractions are truncated and non-numbers give 0. */
export const clampIndex = (index: number, length: number): number => Math.max(0, Math.min(Math.trunc(index) || 0, length))
