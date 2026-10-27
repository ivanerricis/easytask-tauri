import { describe, expect, it } from "vitest"
import { GROUP_MAX_WIDTH, GROUP_MIN_WIDTH, clampGroupWidth, groupWidthForKey } from "./group-width"

describe("group width helpers", () => {
    it("clamps the width to the allowed range", () => {
        expect(clampGroupWidth(50)).toBe(GROUP_MIN_WIDTH)
        expect(clampGroupWidth(9999)).toBe(GROUP_MAX_WIDTH)
        expect(clampGroupWidth(300.4)).toBe(300)
        expect(clampGroupWidth(Number.NaN)).toBe(GROUP_MIN_WIDTH)
    })

    it("maps keys to widths", () => {
        expect(groupWidthForKey("ArrowRight", 300, false)).toBe(316)
        expect(groupWidthForKey("ArrowLeft", 300, false)).toBe(284)
        expect(groupWidthForKey("ArrowRight", 300, true)).toBe(364)
        expect(groupWidthForKey("ArrowLeft", GROUP_MIN_WIDTH, false)).toBe(GROUP_MIN_WIDTH)
        expect(groupWidthForKey("ArrowRight", GROUP_MAX_WIDTH, true)).toBe(GROUP_MAX_WIDTH)
        expect(groupWidthForKey("Home", 400, false)).toBe(GROUP_MIN_WIDTH)
        expect(groupWidthForKey("End", 400, false)).toBe(GROUP_MAX_WIDTH)
        expect(groupWidthForKey("a", 400, false)).toBeNull()
    })
})
