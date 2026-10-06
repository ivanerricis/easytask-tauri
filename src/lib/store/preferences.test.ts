import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { getAudioVolume, saveAudioVolume, getAudioPlayerVisible, saveAudioPlayerVisible, getAudioPlayerScale, saveAudioPlayerScale, getAudioPlayerOpacity, saveAudioPlayerOpacity, getColorIntensity, saveColorIntensity, flushPreferences, clearLastWorkspaceId, getLastWorkspaceId, getReopenLastWorkspace, saveLastWorkspaceId, saveReopenLastWorkspace, getShowGroupProgressBar, getSidebarItemSize, getSidebarLeftWidth, saveSidebarLeftWidth, getSidebarRightWidth, saveSidebarRightWidth, getRightPanelTab, saveRightPanelTab, saveShowGroupProgressBar, saveSidebarItemSize, getHideCompletedTasks, saveHideCompletedTasks, getPrimaryColor, getAudioPlayerPosition, getUndoLimit, saveUndoLimit, getShowAudioFileCount, getShowGroupSeparators, saveShowGroupSeparators, getWorkspaceSort, saveWorkspaceSort } from "./preferences"

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

    it.each([[320, 320], [10, 224], [9999, 480]])("clamps the stored width %d to %d", async (stored, expected) => {
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

    it.each([[320, 320], [10, 224], [9999, 480]])("clamps the stored width %d to %d", async (stored, expected) => {
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

describe("hide completed tasks preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("is off by default", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getHideCompletedTasks()).toBe(false)
        expect(store.get).toHaveBeenCalledWith("hideCompletedTasks")
    })

    it("returns the stored value", async () => {
        vi.mocked(store.get).mockResolvedValue(true)
        expect(await getHideCompletedTasks()).toBe(true)
    })

    it("saves the value and flushes the store", async () => {
        const save = saveHideCompletedTasks(true)
        await vi.advanceTimersByTimeAsync(500)
        await save
        expect(store.set).toHaveBeenCalledWith("hideCompletedTasks", true)
        expect(store.save).toHaveBeenCalledTimes(1)
    })
})

describe("primary color preference validation", () => {
    beforeEach(() => vi.resetAllMocks())

    it.each(["#fff", "#FFB375", "#a1b2c3"])("keeps the valid hex %s", async (hex) => {
        vi.mocked(store.get).mockResolvedValue({ hex })
        expect(await getPrimaryColor()).toBe(hex)
    })

    it.each([undefined, null, {}, { hex: 3 }, { hex: "red" }, { hex: "#12" }, { hex: "#12345g" }, { hex: "url(x)" }, "#fff"])("falls back to the default for %j", async (stored) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getPrimaryColor()).toBe("#f97316")
    })
})

describe("audio player position validation", () => {
    beforeEach(() => vi.resetAllMocks())

    it("returns a valid stored position", async () => {
        vi.mocked(store.get).mockResolvedValue({ x: 10, y: 20, scaleX: 1, scaleY: 1 })
        expect(await getAudioPlayerPosition()).toEqual({ x: 10, y: 20, scaleX: 1, scaleY: 1 })
    })

    it.each([undefined, null, "x", {}, { x: "1", y: 2 }, { x: Number.NaN, y: 2 }, { x: 1, y: Infinity }])("falls back to the default for %j", async (stored) => {
        vi.mocked(store.get).mockResolvedValue(stored)
        expect(await getAudioPlayerPosition()).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
    })

    it("defaults a missing or invalid scale to 1", async () => {
        vi.mocked(store.get).mockResolvedValue({ x: 1, y: 2, scaleX: "a" })
        expect(await getAudioPlayerPosition()).toEqual({ x: 1, y: 2, scaleX: 1, scaleY: 1 })
    })
})

describe("undo limit preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it.each([undefined, null, "100", 0, -5, 12.5, 501, NaN, 1e9])("falls back to 50 for the stored value %s", async (value) => {
        vi.mocked(store.get).mockResolvedValue(value)
        expect(await getUndoLimit()).toBe(50)
    })

    it.each([1, 25, 200, 500])("returns the valid stored value %s", async (value) => {
        vi.mocked(store.get).mockResolvedValue(value)
        expect(await getUndoLimit()).toBe(value)
        expect(store.get).toHaveBeenCalledWith("undoLimit")
    })

    it("saves a valid value and flushes the store", async () => {
        const p = saveUndoLimit(100)
        await vi.runAllTimersAsync()
        await p
        expect(store.set).toHaveBeenCalledWith("undoLimit", 100)
        expect(store.save).toHaveBeenCalled()
    })

    it("ignores an invalid value", async () => {
        await saveUndoLimit(0)
        await saveUndoLimit(2.5)
        expect(store.set).not.toHaveBeenCalled()
    })
})

describe("audio file count and section separators preferences", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("show the audio file count by default and the separators never by default", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getShowAudioFileCount()).toBe(true)
        expect(await getShowGroupSeparators()).toBe(false)
    })

    it("saves the separators", async () => {
        const p = saveShowGroupSeparators(true)
        await vi.runAllTimersAsync()
        await p
        expect(store.set).toHaveBeenCalledWith("showGroupSeparators", true)
    })
})

describe("workspace sort preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
    })

    it("defaults to last edited first when nothing is stored", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getWorkspaceSort()).toEqual({ by: "edited", dir: "desc" })
    })

    it("returns the stored value", async () => {
        vi.mocked(store.get).mockResolvedValue({ by: "name", dir: "asc" })
        expect(await getWorkspaceSort()).toEqual({ by: "name", dir: "asc" })
        expect(store.get).toHaveBeenCalledWith("workspaceSort")
    })

    it.each([null, "name", 3, {}, { by: "name" }, { by: "size", dir: "asc" }, { by: "name", dir: "up" }])(
        "falls back to the default for the invalid value %j",
        async (value) => {
            vi.mocked(store.get).mockResolvedValue(value)
            expect(await getWorkspaceSort()).toEqual({ by: "edited", dir: "desc" })
        })

    it("saves the value and flushes the store", async () => {
        const p = saveWorkspaceSort({ by: "created", dir: "asc" })
        await vi.runAllTimersAsync()
        await p
        expect(store.set).toHaveBeenCalledWith("workspaceSort", { by: "created", dir: "asc" })
    })
})
