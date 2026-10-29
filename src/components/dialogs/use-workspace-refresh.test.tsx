import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useWorkspaceRefresh } from "./use-workspace-refresh"

const getWorkspaceData = vi.fn()
const refreshActiveNote = vi.fn()
let workspace: { id: number } | null = { id: 7 }

vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: workspace }) }))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ getWorkspaceData }) }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ refreshActiveNote }) }))

beforeEach(() => {
    workspace = { id: 7 }
    getWorkspaceData.mockReset().mockResolvedValue(undefined)
    refreshActiveNote.mockReset().mockResolvedValue(undefined)
})

describe("useWorkspaceRefresh", () => {
    it("reloads the workspace and then the open note", async () => {
        const order: string[] = []
        getWorkspaceData.mockImplementation(async () => { order.push("data") })
        refreshActiveNote.mockImplementation(async () => { order.push("note") })
        const { result } = renderHook(() => useWorkspaceRefresh())
        await result.current()
        expect(getWorkspaceData).toHaveBeenCalledWith(7)
        expect(order).toEqual(["data", "note"])
    })

    it("does nothing without an open workspace", async () => {
        workspace = null
        const { result } = renderHook(() => useWorkspaceRefresh())
        await result.current()
        expect(getWorkspaceData).not.toHaveBeenCalled()
        expect(refreshActiveNote).not.toHaveBeenCalled()
    })
})
