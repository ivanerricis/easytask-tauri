import { beforeEach, describe, expect, it, vi } from "vitest"
import { forgetPosition, getResumePosition, isResumable, rememberPosition } from "./audio-positions"
import * as prefs from "@/lib/store/preferences"
import type { AudioPositions } from "@/lib/store/preferences"

vi.mock("@/lib/store/preferences", async importOriginal => ({
    ...await importOriginal<typeof import("@/lib/store/preferences")>(),
    getPref: vi.fn(),
    savePref: vi.fn(),
}))

let stored: AudioPositions

describe("audio positions", () => {
    beforeEach(() => {
        stored = {}
        vi.mocked(prefs.getPref).mockImplementation(async () => structuredClone(stored) as never)
        vi.mocked(prefs.savePref).mockImplementation(async (_name, value) => { stored = structuredClone(value) as AudioPositions })
    })

    it("is resumable only at least 3 s away from the start and from the end", () => {
        expect(isResumable(2.9)).toBe(false)
        expect(isResumable(3)).toBe(true)
        expect(isResumable(100, 200)).toBe(true)
        expect(isResumable(197, 200)).toBe(true)
        expect(isResumable(197.5, 200)).toBe(false)
        expect(isResumable(200, 200)).toBe(false)
        expect(isResumable(100, Number.NaN)).toBe(true)
        expect(isResumable(Number.NaN)).toBe(false)
    })

    it("remembers a position and gives it back", async () => {
        await rememberPosition(5, 61.26, 300)
        expect(stored["5"].position).toBe(61.3)
        expect(await getResumePosition(5, 300)).toBe(61.3)
        expect(await getResumePosition(6, 300)).toBe(0)
    })

    it("does not resume near the end of the track", async () => {
        await rememberPosition(5, 100, 300)
        expect(await getResumePosition(5, 101)).toBe(0)
    })

    it("forgets the position when it is near the start or the end, and when the track ends", async () => {
        await rememberPosition(5, 100, 300)
        await rememberPosition(5, 1, 300)
        expect(stored).toEqual({})
        await rememberPosition(5, 100, 300)
        await rememberPosition(5, 299, 300)
        expect(stored).toEqual({})
        await rememberPosition(5, 100, 300)
        await rememberPosition(6, 50, 300)
        await forgetPosition(5)
        expect(Object.keys(stored)).toEqual(["6"])
    })

    it("does not save when there is nothing to change", async () => {
        await forgetPosition(9)
        await rememberPosition(9, 0, 300)
        expect(prefs.savePref).not.toHaveBeenCalled()
    })

    it("keeps quick updates one after the other", async () => {
        await Promise.all([rememberPosition(1, 10, 300), rememberPosition(2, 20, 300), rememberPosition(3, 30, 300)])
        expect(Object.keys(stored).sort()).toEqual(["1", "2", "3"])
    })

    it("gives 0 when the store fails", async () => {
        vi.mocked(prefs.getPref).mockRejectedValue(new Error("no"))
        expect(await getResumePosition(1)).toBe(0)
    })
})
