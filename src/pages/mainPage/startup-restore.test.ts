import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetStartupRestore, useStartupRestore } from "./startup-restore"
import { getLastWorkspaceId, getReopenLastWorkspace } from "@/lib/store/preferences"
import { makeWorkspace } from "@/test/ui-fixtures"

const ctx = { workspaces: [] as ReturnType<typeof makeWorkspace>[], setCurrentWorkspace: vi.fn() }
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ctx }))
const navigate = vi.fn()
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }))
vi.mock("@/lib/store/preferences", () => ({ getReopenLastWorkspace: vi.fn(), getLastWorkspaceId: vi.fn() }))

describe("useStartupRestore", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.workspaces = []
        resetStartupRestore()
        vi.mocked(getReopenLastWorkspace).mockResolvedValue(false)
        vi.mocked(getLastWorkspaceId).mockResolvedValue(null)
    })

    it("opens the stored workspace when enabled", async () => {
        const ws = makeWorkspace({ id: 9 })
        ctx.workspaces = [makeWorkspace({ id: 1 }), ws]
        vi.mocked(getReopenLastWorkspace).mockResolvedValue(true)
        vi.mocked(getLastWorkspaceId).mockResolvedValue(9)
        const { result } = renderHook(() => useStartupRestore(true))

        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/workspace/9"))
        expect(ctx.setCurrentWorkspace).toHaveBeenCalledWith(ws)
        await waitFor(() => expect(result.current.pending).toBe(false))
    })

    it("stays pending until the workspaces are loaded", async () => {
        const { result, rerender } = renderHook(({ loaded }) => useStartupRestore(loaded), { initialProps: { loaded: false } })
        expect(result.current.pending).toBe(true)
        expect(getReopenLastWorkspace).not.toHaveBeenCalled()

        rerender({ loaded: true })
        await waitFor(() => expect(result.current.pending).toBe(false))
        expect(navigate).not.toHaveBeenCalled()
    })

    it("does nothing when the stored id is not in the list", async () => {
        ctx.workspaces = [makeWorkspace({ id: 1 })]
        vi.mocked(getReopenLastWorkspace).mockResolvedValue(true)
        vi.mocked(getLastWorkspaceId).mockResolvedValue(42)
        const { result } = renderHook(() => useStartupRestore(true))
        await waitFor(() => expect(result.current.pending).toBe(false))
        expect(navigate).not.toHaveBeenCalled()
    })

    it("stops pending even when reading the preferences fails", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        vi.mocked(getReopenLastWorkspace).mockRejectedValue(new Error("boom"))
        const { result } = renderHook(() => useStartupRestore(true))
        await waitFor(() => expect(result.current.pending).toBe(false))
        expect(spy).toHaveBeenCalled()
    })

    it("only runs once per session", async () => {
        ctx.workspaces = [makeWorkspace({ id: 9 })]
        vi.mocked(getReopenLastWorkspace).mockResolvedValue(true)
        vi.mocked(getLastWorkspaceId).mockResolvedValue(9)
        const first = renderHook(() => useStartupRestore(true))
        await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
        first.unmount()

        const second = renderHook(() => useStartupRestore(true))
        expect(second.result.current.pending).toBe(false)
        expect(navigate).toHaveBeenCalledTimes(1)
    })
})
