import { beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { getSidebarItemSize, saveSidebarItemSize } from "./preferences"

vi.mock("./initStore", () => ({
    store: { get: vi.fn(), set: vi.fn(), save: vi.fn() },
}))

describe("sidebar item size preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it("defaults to normal when nothing is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getSidebarItemSize()).toBe("normal")
    })

    it.each(["compact", "normal", "large"])("returns the stored value %s", async (value) => {
        vi.mocked(store.get).mockResolvedValue(value)
        expect(await getSidebarItemSize()).toBe(value)
        expect(store.get).toHaveBeenCalledWith("sidebarItemSize")
    })

    it.each(["huge", 3, null, ""])("falls back to normal for the invalid value %j", async (value) => {
        vi.mocked(store.get).mockResolvedValue(value)
        expect(await getSidebarItemSize()).toBe("normal")
    })

    it("saves the value and flushes the store", async () => {
        await saveSidebarItemSize("large")
        expect(store.set).toHaveBeenCalledWith("sidebarItemSize", "large")
        expect(store.save).toHaveBeenCalled()
    })
})
