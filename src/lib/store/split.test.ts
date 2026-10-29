import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { flushPreferences } from "./preferences"
import { getSplitRatio, saveSplitRatio } from "./split"

vi.mock("./initStore", () => ({ store: { get: vi.fn(), set: vi.fn(), save: vi.fn(), delete: vi.fn() } }))

describe("split ratio store", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })
    afterEach(async () => {
        await flushPreferences()
        vi.useRealTimers()
    })

    it("defaults to 0.5 when nothing is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getSplitRatio()).toBe(0.5)
        expect(store.get).toHaveBeenCalledWith("splitRatio")
    })

    it("returns a stored ratio", async () => {
        vi.mocked(store.get).mockResolvedValue(0.4)
        expect(await getSplitRatio()).toBe(0.4)
    })

    it.each(["wide", null, NaN, {}])("falls back to the default for the invalid value %j", async value => {
        vi.mocked(store.get).mockResolvedValue(value)
        expect(await getSplitRatio()).toBe(0.5)
    })

    it("clamps stored values that are out of range", async () => {
        vi.mocked(store.get).mockResolvedValue(5)
        expect(await getSplitRatio()).toBe(0.9)
        vi.mocked(store.get).mockResolvedValue(-1)
        expect(await getSplitRatio()).toBe(0.1)
    })

    it("saves the clamped ratio, debounced", async () => {
        const saved = saveSplitRatio(0.97)
        await vi.advanceTimersByTimeAsync(500)
        await saved
        expect(store.set).toHaveBeenCalledWith("splitRatio", 0.9)
        expect(store.save).toHaveBeenCalledTimes(1)
    })
})
