import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { getAudioVolume, saveAudioVolume, getAudioPlayerVisible, saveAudioPlayerVisible, getAudioPlayerScale, saveAudioPlayerScale, getAudioPlayerOpacity, saveAudioPlayerOpacity, getColorIntensity, saveColorIntensity, flushPreferences, clearLastWorkspaceId, getLastWorkspaceId, getReopenLastWorkspace, saveLastWorkspaceId, saveReopenLastWorkspace, getShowGroupProgressBar, getSidebarItemSize, getSidebarLeftWidth, saveSidebarLeftWidth, getSidebarRightWidth, saveSidebarRightWidth, getRightPanelTab, saveRightPanelTab, saveShowGroupProgressBar, saveSidebarItemSize } from "./preferences"

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

describe("left sidebar width preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("defaults to 260 when nothing valid is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getSidebarLeftWidth()).toBe(260)
        vi.mocked(store.get).mockResolvedValue("wide")
        expect(await getSidebarLeftWidth()).toBe(260)
        vi.mocked(store.get).mockResolvedValue(Number.NaN)
        expect(await getSidebarLeftWidth()).toBe(260)
    })

    it.each([[320, 320], [10, 200], [9999, 480]])("clamps the stored width %d to %d", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getSidebarLeftWidth()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("sidebarLeftWidth")
    })

    it("saves the clamped width and flushes the store", async () => {
        const p = saveSidebarLeftWidth(9999)
        await vi.advanceTimersByTimeAsync(500)
        await p
        expect(store.set).toHaveBeenCalledWith("sidebarLeftWidth", 480)
        expect(store.save).toHaveBeenCalled()
    })
})

describe("right sidebar width and tab preferences", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("defaults the width to 260 when nothing valid is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getSidebarRightWidth()).toBe(260)
        vi.mocked(store.get).mockResolvedValue("wide")
        expect(await getSidebarRightWidth()).toBe(260)
    })

    it.each([[320, 320], [10, 200], [9999, 480]])("clamps the stored width %d to %d", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getSidebarRightWidth()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("sidebarRightWidth")
    })

    it("saves the clamped width", async () => {
        const p = saveSidebarRightWidth(9999)
        await vi.advanceTimersByTimeAsync(500)
        await p
        expect(store.set).toHaveBeenCalledWith("sidebarRightWidth", 480)
    })

    it.each([[undefined, "details"], ["bogus", "details"], ["details", "details"], ["history", "history"]])("reads the tab %s as %s", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getRightPanelTab()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("rightPanelTab")
    })

    it("saves the tab", async () => {
        const p = saveRightPanelTab("history")
        await vi.advanceTimersByTimeAsync(500)
        await p
        expect(store.set).toHaveBeenCalledWith("rightPanelTab", "history")
    })
})

describe("audio player preferences", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("has backwards compatible defaults when nothing is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getAudioVolume()).toBe(1)
        expect(await getAudioPlayerVisible()).toBe(true)
        expect(await getAudioPlayerScale()).toBe(1)
        expect(await getAudioPlayerOpacity()).toBe(1)
    })

    it.each([[0.4, 0.4], [-1, 0], [7, 1], ["loud", 1], [Number.NaN, 1]])("reads the volume %s as %s", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getAudioVolume()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("audioVolume")
    })

    it.each([[0.85, 0.85], [1.2, 1.2], [2, 1], ["big", 1]])("reads the scale %s as %s", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getAudioPlayerScale()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("audioPlayerScale")
    })

    it.each([[0.7, 0.7], [0.1, 0.4], [3, 1], ["x", 1]])("reads the opacity %s as %s", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getAudioPlayerOpacity()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("audioPlayerOpacity")
    })

    it("reads the visibility flag", async () => {
        vi.mocked(store.get).mockResolvedValue(false)
        expect(await getAudioPlayerVisible()).toBe(false)
        expect(store.get).toHaveBeenCalledWith("audioPlayerVisible")
    })

    it("saves every value (clamped) with a debounced flush", async () => {
        const saves = [saveAudioVolume(5), saveAudioPlayerVisible(false), saveAudioPlayerScale(1.2), saveAudioPlayerOpacity(0.1)]
        await vi.advanceTimersByTimeAsync(500)
        await Promise.all(saves)
        expect(store.set).toHaveBeenCalledWith("audioVolume", 1)
        expect(store.set).toHaveBeenCalledWith("audioPlayerVisible", false)
        expect(store.set).toHaveBeenCalledWith("audioPlayerScale", 1.2)
        expect(store.set).toHaveBeenCalledWith("audioPlayerOpacity", 0.4)
        expect(store.save).toHaveBeenCalledTimes(1)
    })

    it("has the default color intensity of 100% when nothing is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getColorIntensity()).toBe(1)
    })

    it.each([[1.5, 1.5], [0.25, 0.25], [0.1, 0.25], [5, 1.75], ["x", 1], [Number.NaN, 1]])("reads the color intensity %s as %s", async (stored, expected) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getColorIntensity()).toBe(expected)
        expect(store.get).toHaveBeenCalledWith("colorIntensity")
    })

    it("saves the color intensity (clamped) with a debounced flush", async () => {
        const save = saveColorIntensity(9)
        await vi.advanceTimersByTimeAsync(500)
        await save
        expect(store.set).toHaveBeenCalledWith("colorIntensity", 1.75)
        expect(store.save).toHaveBeenCalledTimes(1)
    })
})
