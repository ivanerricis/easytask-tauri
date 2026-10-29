import { describe, expect, it } from "vitest"
import { resizeKeyDelta } from "./resize-keys"

describe("resizeKeyDelta", () => {
    it("maps the arrows to the small or large step", () => {
        expect(resizeKeyDelta("ArrowRight", false, 16, 64)).toBe(16)
        expect(resizeKeyDelta("ArrowLeft", false, 16, 64)).toBe(-16)
        expect(resizeKeyDelta("ArrowRight", true, 16, 64)).toBe(64)
        expect(resizeKeyDelta("ArrowLeft", true, 16, 64)).toBe(-64)
    })

    it("maps Home and End to the extremes and ignores other keys", () => {
        expect(resizeKeyDelta("Home", false, 1, 2)).toBe("min")
        expect(resizeKeyDelta("End", true, 1, 2)).toBe("max")
        expect(resizeKeyDelta("a", false, 1, 2)).toBeNull()
    })
})
