import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { PreferencesContext, type PreferencesContextType } from "@/contexts/preferences-context-object"
import { useDeleteRequest } from "./use-delete-item"

const deleteItem = vi.fn()
const confirmPref = { value: true }
const reportError = vi.fn()
const toastTrashed = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ deleteItem }) }))
vi.mock("@/lib/report-error", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/report-error")>(), reportError: (...args: unknown[]) => reportError(...args) }))
vi.mock("@/lib/toast-trashed", () => ({ toastTrashed: (...args: unknown[]) => toastTrashed(...args) }))

const wrapper = ({ children }: { children: ReactNode }) => (
    <PreferencesContext.Provider value={{ confirmDeleteWithContent: confirmPref.value } as PreferencesContextType}>{children}</PreferencesContext.Provider>
)

const setup = (hasContent: () => boolean | Promise<boolean>, optimistic?: () => () => void) => {
    const openDialog = vi.fn()
    const { result } = renderHook(() => useDeleteRequest({ item: { id: 4 }, itemType: "note", hasContent, openDialog, optimistic }), { wrapper })
    return { request: result.current.request, openDialog }
}

describe("useDeleteRequest", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        confirmPref.value = true
        deleteItem.mockResolvedValue(undefined)
    })

    it("opens the dialog for an item with content", async () => {
        const { request, openDialog } = setup(() => true)
        act(() => request())
        await waitFor(() => expect(openDialog).toHaveBeenCalledTimes(1))
        expect(deleteItem).not.toHaveBeenCalled()
    })

    it("deletes at once an item without content", async () => {
        const { request, openDialog } = setup(async () => false)
        act(() => request())
        await waitFor(() => expect(deleteItem).toHaveBeenCalledWith("note", 4))
        expect(openDialog).not.toHaveBeenCalled()
        expect(toastTrashed).toHaveBeenCalled()
    })

    it("never asks when the preference is off", async () => {
        confirmPref.value = false
        const hasContent = vi.fn(() => true)
        const { request, openDialog } = setup(hasContent)
        act(() => request())
        await waitFor(() => expect(deleteItem).toHaveBeenCalledTimes(1))
        expect(hasContent).not.toHaveBeenCalled()
        expect(openDialog).not.toHaveBeenCalled()
    })

    it("asks when the content cannot be checked", async () => {
        const { request, openDialog } = setup(() => Promise.reject(new Error("db")))
        act(() => request())
        await waitFor(() => expect(openDialog).toHaveBeenCalledTimes(1))
        expect(deleteItem).not.toHaveBeenCalled()
    })

    it("rolls back and reports a failed direct delete", async () => {
        const rollback = vi.fn()
        deleteItem.mockRejectedValue(new Error("constraint"))
        const { request } = setup(() => false, () => rollback)
        act(() => request())
        await waitFor(() => expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.stringContaining("constraint")))
        expect(rollback).toHaveBeenCalledTimes(1)
    })

    it("ignores a second click while the first is pending", async () => {
        let release = () => { }
        deleteItem.mockImplementation(() => new Promise<void>(resolve => { release = resolve }))
        const { request } = setup(() => false)
        act(() => { request(); request() })
        await waitFor(() => expect(deleteItem).toHaveBeenCalledTimes(1))
        release()
        await waitFor(() => expect(toastTrashed).toHaveBeenCalled())
        expect(deleteItem).toHaveBeenCalledTimes(1)
    })
})
