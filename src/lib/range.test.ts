import { describe, expect, it } from "vitest"
import { rangeStyle } from "./range"

const progress = (value: number, min: number, max: number) => (rangeStyle(value, min, max) as Record<string, number>)["--range-progress"]

describe("rangeStyle", () => {
    it("is the position of the value in the range, from 0 to 1", () => {
        expect(progress(0, 0, 100)).toBe(0)
        expect(progress(25, 0, 100)).toBe(0.25)
        expect(progress(100, 0, 100)).toBe(1)
    })

    it("counts from the minimum of the range", () => {
        expect(progress(40, 40, 100)).toBe(0)
        expect(progress(70, 40, 100)).toBe(0.5)
    })

    it("stays between 0 and 1", () => {
        expect(progress(-5, 0, 100)).toBe(0)
        expect(progress(150, 0, 100)).toBe(1)
    })

    it("is empty for a range without a length or with a value that is not a number", () => {
        expect(progress(10, 0, 0)).toBe(0)
        expect(progress(10, 5, 5)).toBe(0)
        expect(progress(Number.NaN, 0, 100)).toBe(0)
        expect(progress(10, 0, Number.NaN)).toBe(0)
        expect(progress(10, 0, Number.POSITIVE_INFINITY)).toBe(0)
    })
})
