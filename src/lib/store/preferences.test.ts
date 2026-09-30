import { beforeEach, describe, expect, it, vi } from "vitest"
import { store } from "./initStore"
import { clearLastWorkspaceId, getLastWorkspaceId, getReopenLastWorkspace, saveLastWorkspaceId, saveReopenLastWorkspace, getShowGroupProgressBar, getSidebarItemSize, saveShowGroupProgressBar, saveSidebarItemSize } from "./preferences"

vi.mock("./initStore", () => ({
    store: { get: vi.fn(), set: vi.fn(), save: vi.fn(), delete: vi.fn() },
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

describe("show group progress bar preference", () => {
    beforeEach(() => {
        vi.resetAllMocks()
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
        await saveShowGroupProgressBar(false)
        expect(store.set).toHaveBeenCalledWith("showGroupProgressBar", false)
        expect(store.save).toHaveBeenCalled()
    })
})

describe("reopen last workspace preferences", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it("defaults to false and returns the stored value", async () => {
        vi.mocked(store.get).mockResolvedValue(undefined)
        expect(await getReopenLastWorkspace()).toBe(false)
        vi.mocked(store.get).mockResolvedValue(true)
        expect(await getReopenLastWorkspace()).toBe(true)
        expect(store.get).toHaveBeenCalledWith("reopenLastWorkspace")
    })

    it("saves the preference and flushes the store", async () => {
        await saveReopenLastWorkspace(true)
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
        await saveLastWorkspaceId(3)
        expect(store.set).toHaveBeenCalledWith("lastWorkspaceId", 3)
        await clearLastWorkspaceId()
        expect(store.delete).toHaveBeenCalledWith("lastWorkspaceId")
        expect(store.save).toHaveBeenCalledTimes(2)
    })
})
