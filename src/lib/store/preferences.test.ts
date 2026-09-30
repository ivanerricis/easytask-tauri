import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { flushPreferences, clearLastWorkspaceId, getLastWorkspaceId, getReopenLastWorkspace, saveLastWorkspaceId, saveReopenLastWorkspace, getShowGroupProgressBar, getSidebarItemSize, saveShowGroupProgressBar, saveSidebarItemSize } from "./preferences"

vi.mock("./initStore", () => ({
    store: { get: vi.fn(), set: vi.fn(), save: vi.fn(), delete: vi.fn() },
}))

afterEach(async () => {
    await flushPreferences()
    vi.useRealTimers()
})

describe("sidebar item size preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
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
        const p = saveSidebarItemSize("large")
        await vi.advanceTimersByTimeAsync(500)
        await p
        expect(store.set).toHaveBeenCalledWith("sidebarItemSize", "large")
        expect(store.save).toHaveBeenCalled()
    })
})

describe("show group progress bar preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("defaults to true when nothing is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getShowGroupProgressBar()).toBe(true)
        expect(store.get).toHaveBeenCalledWith("showGroupProgressBar")
    })

    it("returns the stored value", async () => {
        vi.mocked(store.get).mockResolvedValue(false)
        expect(await getShowGroupProgressBar()).toBe(false)
    })

    it("saves the value and flushes the store", async () => {
        const p = saveShowGroupProgressBar(false)
        await vi.advanceTimersByTimeAsync(500)
        await p
        expect(store.set).toHaveBeenCalledWith("showGroupProgressBar", false)
        expect(store.save).toHaveBeenCalled()
    })
})

describe("reopen last workspace preferences", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("defaults to false and returns the stored value", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getReopenLastWorkspace()).toBe(false)
        vi.mocked(store.get).mockResolvedValue(true)
        expect(await getReopenLastWorkspace()).toBe(true)
        expect(store.get).toHaveBeenCalledWith("reopenLastWorkspace")
    })

    it("saves the preference and flushes the store", async () => {
        const p = saveReopenLastWorkspace(true)
        await vi.advanceTimersByTimeAsync(500)
        await p
        expect(store.set).toHaveBeenCalledWith("reopenLastWorkspace", true)
        expect(store.save).toHaveBeenCalled()
    })

    it("returns the stored workspace id or null", async () => {
        vi.mocked(store.get).mockResolvedValue(7)
        expect(await getLastWorkspaceId()).toBe(7)
        expect(store.get).toHaveBeenCalledWith("lastWorkspaceId")
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getLastWorkspaceId()).toBeNull()
    })

    it("saves and clears the last workspace id", async () => {
        const a = saveLastWorkspaceId(3)
        expect(store.set).toHaveBeenCalledWith("lastWorkspaceId", 3)
        const b = clearLastWorkspaceId()
        await vi.advanceTimersByTimeAsync(500)
        await Promise.all([a, b])
        expect(store.delete).toHaveBeenCalledWith("lastWorkspaceId")
        expect(store.save).toHaveBeenCalledTimes(1)
    })
})

describe("batched saves", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("sets immediately but saves once after the debounce", async () => {
        const p1 = saveShowGroupProgressBar(true)
        const p2 = saveSidebarItemSize("compact")
        expect(store.set).toHaveBeenCalledTimes(2)
        expect(store.save).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(499)
        expect(store.save).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        await Promise.all([p1, p2])
        expect(store.save).toHaveBeenCalledTimes(1)
    })

    it("restarts the debounce on every change", async () => {
        const p1 = saveSidebarItemSize("compact")
        await vi.advanceTimersByTimeAsync(400)
        const p2 = saveSidebarItemSize("large")
        await vi.advanceTimersByTimeAsync(400)
        expect(store.save).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(100)
        await Promise.all([p1, p2])
        expect(store.save).toHaveBeenCalledTimes(1)
    })

    it("flushPreferences saves right away and cancels the timer", async () => {
        const p = saveSidebarItemSize("large")
        await vi.advanceTimersByTimeAsync(0)
        await flushPreferences()
        await p
        expect(store.save).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1000)
        expect(store.save).toHaveBeenCalledTimes(1)
    })

    it("flushPreferences does nothing when nothing is pending", async () => {
        await flushPreferences()
        expect(store.save).not.toHaveBeenCalled()
    })

    it("rejects the pending promises when the save fails", async () => {
        vi.mocked(store.save).mockRejectedValueOnce(new Error("disk"))
        const p = saveSidebarItemSize("large")
        const assertion = expect(p).rejects.toThrow("disk")
        await vi.advanceTimersByTimeAsync(500)
        await assertion
    })
})
