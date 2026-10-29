import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useItemMutations } from "./use-item-mutations"

const updateItemColor = vi.fn()
const archiveItem = vi.fn()
const recorder = { archive: vi.fn() }
const reportError = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ updateItemColor, archiveItem }) }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => recorder }))
vi.mock("@/lib/report-error", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/report-error")>(), reportError: (...args: unknown[]) => reportError(...args) }))

describe("useItemMutations", () => {
    const rollback = vi.fn()
    const patch = vi.fn()
    const remove = vi.fn()
    beforeEach(() => {
        vi.resetAllMocks()
        patch.mockReturnValue(rollback)
        remove.mockReturnValue(rollback)
        updateItemColor.mockResolvedValue(undefined)
        archiveItem.mockResolvedValue(undefined)
    })

    it("patches the color at once and writes it", async () => {
        const { result } = renderHook(() => useItemMutations("task", patch, remove))
        await result.current.addColorItem("task", 4, "#f00")
        expect(patch).toHaveBeenCalledWith(4, { color: "#f00" })
        expect(updateItemColor).toHaveBeenCalledWith("task", 4, "#f00")
        expect(rollback).not.toHaveBeenCalled()
    })

    it("clears the color with null in the cache", async () => {
        const { result } = renderHook(() => useItemMutations("task", patch, remove))
        await result.current.addColorItem("task", 4)
        expect(patch).toHaveBeenCalledWith(4, { color: null })
    })

    it("restores the cache and rethrows when the color write fails", async () => {
        updateItemColor.mockRejectedValue(new Error("boom"))
        const { result } = renderHook(() => useItemMutations("section", patch, remove))
        await expect(result.current.addColorItem("section", 2, "#0f0")).rejects.toThrow("boom")
        expect(rollback).toHaveBeenCalled()
    })

    it("removes the item at once, archives it and records one undo step", async () => {
        const { result } = renderHook(() => useItemMutations("section_group", patch, remove))
        await result.current.archive(7, "Group")
        expect(remove).toHaveBeenCalledWith(7)
        expect(archiveItem).toHaveBeenCalledWith("section_group", 7)
        expect(recorder.archive).toHaveBeenCalledWith("section_group", 7, "Group")
        expect(rollback).not.toHaveBeenCalled()
    })

    it("puts the item back and reports the error when the archive fails", async () => {
        archiveItem.mockRejectedValue(new Error("nope"))
        const { result } = renderHook(() => useItemMutations("task", patch, remove))
        await result.current.archive(3, "Task")
        expect(rollback).toHaveBeenCalled()
        expect(reportError).toHaveBeenCalledWith(expect.any(Error), "nope")
        expect(recorder.archive).not.toHaveBeenCalled()
    })
})
