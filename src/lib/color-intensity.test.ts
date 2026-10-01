import { describe, expect, it } from "vitest"
import { COLOR_ALPHA_BASE, clampColorIntensity, scaleAlpha } from "./color-intensity"

describe("clampColorIntensity", () => {
    it.each([[1, 1], [0.25, 0.25], [1.75, 1.75], [0.1, 0.25], [9, 1.75], [-1, 0.25], [1.234, 1.23]])("brings %s to %s", (value, expected) => {
        expect(clampColorIntensity(value)).toBe(expected)
    })

    it.each([["x"], [undefined], [null], [Number.NaN], [Infinity]])("gives 1 for the invalid value %s", (value) => {
        expect(clampColorIntensity(value)).toBe(1)
    })
})

describe("scaleAlpha", () => {
    it("keeps today's alphas at 100% (default)", () => {
        expect(scaleAlpha(COLOR_ALPHA_BASE.item)).toBe(0.3)
        expect(scaleAlpha(COLOR_ALPHA_BASE.itemHover, 1)).toBe(0.5)
        expect(scaleAlpha(COLOR_ALPHA_BASE.header, 1)).toBe(0.4)
    })

    it("scales the base alpha", () => {
        expect(scaleAlpha(0.4, 0.5)).toBe(0.2)
        expect(scaleAlpha(0.3, 1.5)).toBe(0.45)
    })

    it("limits the final alpha to 0.05-0.85", () => {
        expect(scaleAlpha(0.3, 0.25)).toBe(0.075)
        expect(scaleAlpha(0.1, 0.25)).toBe(0.05)
        expect(scaleAlpha(0.5, 1.75)).toBe(0.85)
        expect(scaleAlpha(0.4, 1.75)).toBe(0.7)
    })

    it("treats an invalid intensity as 100%", () => {
        expect(scaleAlpha(0.3, "x")).toBe(0.3)
        expect(scaleAlpha(0.3, Number.NaN)).toBe(0.3)
    })
})
