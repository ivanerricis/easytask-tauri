import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useStoredSwitch } from "./use-stored-switch"

const reportError = vi.fn()
vi.mock("@/lib/report-error", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/report-error")>()), reportError: (...a: unknown[]) => reportError(...a) }))

beforeEach(() => reportError.mockReset())

describe("useStoredSwitch", () => {
    it("starts with the initial value and takes the stored one", async () => {
        const get = vi.fn().mockResolvedValue(true)
        const { result } = renderHook(() => useStoredSwitch(get, vi.fn()))
        expect(result.current.checked).toBe(false)
        expect(result.current.ready).toBe(false)
        await waitFor(() => expect(result.current.ready).toBe(true))
        expect(result.current.checked).toBe(true)
    })

    it("uses the given initial value", () => {
        const { result } = renderHook(() => useStoredSwitch(() => new Promise<boolean>(() => undefined), vi.fn(), { initial: true }))
        expect(result.current.checked).toBe(true)
    })

    it("reports a failed read and keeps the initial value (not ready)", async () => {
        const error = new Error("read")
        const { result } = renderHook(() => useStoredSwitch(() => Promise.reject(error), vi.fn(), { initial: true }))
        await waitFor(() => expect(reportError).toHaveBeenCalledWith(error))
        expect(result.current.checked).toBe(true)
        expect(result.current.ready).toBe(false)
    })

    it("does not update after unmount", async () => {
        let answer!: (value: boolean) => void
        const get = () => new Promise<boolean>(resolve => { answer = resolve })
        const { result, unmount } = renderHook(() => useStoredSwitch(get, vi.fn()))
        unmount()
        answer(true)
        await Promise.resolve()
        expect(result.current.checked).toBe(false)
    })

    it("changes at once and saves", async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const { result } = renderHook(() => useStoredSwitch(() => Promise.resolve(false), save))
        await waitFor(() => expect(result.current.ready).toBe(true))
        let pending!: Promise<void>
        act(() => { pending = result.current.change(true) })
        expect(save).toHaveBeenCalledWith(true)
        expect(result.current.checked).toBe(true)
        await act(async () => { await pending })
        expect(result.current.checked).toBe(true)
    })

    it("keeps the new value when saving fails, unless revertOnError", async () => {
        const error = new Error("save")
        const { result } = renderHook(() => useStoredSwitch(() => Promise.resolve(false), () => Promise.reject(error)))
        await waitFor(() => expect(result.current.ready).toBe(true))
        await act(async () => { await result.current.change(true) })
        expect(result.current.checked).toBe(true)
        expect(reportError).toHaveBeenCalledWith(error)
    })

    it("goes back to the previous value when saving fails with revertOnError", async () => {
        const error = new Error("save")
        const onError = vi.fn()
        const { result } = renderHook(() => useStoredSwitch(() => Promise.resolve(false), () => Promise.reject(error), { revertOnError: true, onError }))
        await waitFor(() => expect(result.current.ready).toBe(true))
        await act(async () => { await result.current.change(true) })
        expect(result.current.checked).toBe(false)
        expect(onError).toHaveBeenCalledWith(error, true)
        expect(reportError).not.toHaveBeenCalled()
    })

    it("reverts a switch turned off too", async () => {
        const { result } = renderHook(() => useStoredSwitch(() => Promise.resolve(true), () => Promise.reject(new Error("x")), { revertOnError: true }))
        await waitFor(() => expect(result.current.checked).toBe(true))
        await act(async () => { await result.current.change(false) })
        expect(result.current.checked).toBe(true)
    })
})
