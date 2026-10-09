import { act, renderHook } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { reportError } from "@/lib/report-error"

const exportItemToFile = vi.fn()
const importItemsFromFile = vi.fn()
const getWorkspaceData = vi.fn()
const create = vi.hoisted(() => vi.fn())

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/lib/report-error", () => ({ reportError: vi.fn(), resetReportErrorDedupe: vi.fn() }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: { id: 7 }, getWorkspaces: vi.fn() }) }))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ getWorkspaceData }) }))
vi.mock("@/contexts/undo/use-undo", () => {
    const recorder = { create }
    return { useUndoRecorder: () => recorder }
})
vi.mock("@/lib/workspace-transfer", () => ({
    exportWorkspaceToFile: vi.fn(),
    importWorkspaceFromFile: vi.fn(),
    exportItemToFile: (...a: unknown[]) => exportItemToFile(...a),
    importItemsFromFile: (...a: unknown[]) => importItemsFromFile(...a),
}))

import { useItemTransfer } from "./use-workspace-transfer"

beforeEach(() => {
    vi.clearAllMocks()
    exportItemToFile.mockResolvedValue(true)
    getWorkspaceData.mockResolvedValue(undefined)
})

describe("useItemTransfer", () => {
    it("exports an item and confirms", async () => {
        const { result } = renderHook(() => useItemTransfer())
        await act(() => result.current.exportItem("note", { id: 2, name: "N" }))
        expect(exportItemToFile).toHaveBeenCalledWith("note", { id: 2, name: "N" })
        expect(toast.success).toHaveBeenCalledWith("Esportato")
        expect(result.current.isBusy).toBe(false)
    })

    it("stays silent when the export dialog is cancelled and shows the error when it fails", async () => {
        const { result } = renderHook(() => useItemTransfer())
        exportItemToFile.mockResolvedValueOnce(false)
        await act(() => result.current.exportItem("folder", { id: 2, name: "F" }))
        expect(toast.success).not.toHaveBeenCalled()
        exportItemToFile.mockRejectedValueOnce(new Error("boom"))
        await act(() => result.current.exportItem("folder", { id: 2, name: "F" }))
        expect(reportError).toHaveBeenCalledWith(expect.anything(), "boom")
    })

    it("imports into a folder, refreshes the tree, records the creation for undo and confirms", async () => {
        importItemsFromFile.mockResolvedValue({ skippedAudio: 0, items: [{ type: "folder", id: 11, name: "F (2)" }] })
        const { result } = renderHook(() => useItemTransfer())
        await act(() => result.current.importItems(3))
        // Outside the ImportNamesProvider no dialog is shown: the proposed names are used
        expect(importItemsFromFile).toHaveBeenCalledWith(7, 3, undefined)
        expect(getWorkspaceData).toHaveBeenCalledWith(7)
        expect(create).toHaveBeenCalledWith("folder", 11, "F (2)")
        expect(toast.success).toHaveBeenCalledWith("Importato")
    })

    it("reports skipped audio files", async () => {
        importItemsFromFile.mockResolvedValue({ skippedAudio: 2, items: [{ type: "note", id: 5, name: "N" }] })
        const { result } = renderHook(() => useItemTransfer())
        await act(() => result.current.importItems(null))
        expect(toast.success).toHaveBeenCalledWith("Importato · 2 audio saltati")
    })

    it("does nothing when the dialog is cancelled", async () => {
        importItemsFromFile.mockResolvedValue(null)
        const { result } = renderHook(() => useItemTransfer())
        await act(() => result.current.importItems(null))
        expect(getWorkspaceData).not.toHaveBeenCalled()
        expect(create).not.toHaveBeenCalled()
        expect(toast.success).not.toHaveBeenCalled()
    })

    it("shows the error (for example a whole-workspace file) and creates no undo step", async () => {
        importItemsFromFile.mockRejectedValue(new Error("usa la pagina iniziale"))
        const { result } = renderHook(() => useItemTransfer())
        await act(() => result.current.importItems(null))
        expect(reportError).toHaveBeenCalledWith(expect.anything(), "usa la pagina iniziale")
        expect(create).not.toHaveBeenCalled()
        expect(result.current.isBusy).toBe(false)
    })
})
