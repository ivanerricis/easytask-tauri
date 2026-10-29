import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useFormSubmit } from "./use-form-submit"

describe("useFormSubmit", () => {
    it("prevents the default of the form and runs the action", async () => {
        const action = vi.fn().mockResolvedValue(undefined)
        const { result } = renderHook(() => useFormSubmit(action))
        const preventDefault = vi.fn()
        await act(async () => { await result.current.submit({ preventDefault } as never) })
        expect(preventDefault).toHaveBeenCalled()
        expect(action).toHaveBeenCalledTimes(1)
        expect(result.current.error).toBeNull()
        expect(result.current.busy).toBe(false)
    })

    it("works without an event", async () => {
        const action = vi.fn().mockResolvedValue(undefined)
        const { result } = renderHook(() => useFormSubmit(action))
        await act(async () => { await result.current.submit() })
        expect(action).toHaveBeenCalledTimes(1)
    })

    it("keeps the message of a failure in error", async () => {
        const { result } = renderHook(() => useFormSubmit(async () => { throw new Error("Esiste già") }))
        await act(async () => { await result.current.submit() })
        expect(result.current.error).toBe("Esiste già")
        expect(result.current.busy).toBe(false)
    })

    it("clears the error of the previous attempt when it starts", async () => {
        let fail = true
        const { result } = renderHook(() => useFormSubmit(async () => { if (fail) throw new Error("x") }))
        await act(async () => { await result.current.submit() })
        expect(result.current.error).toBe("x")
        fail = false
        await act(async () => { await result.current.submit() })
        expect(result.current.error).toBeNull()
    })

    it("lets the caller clear the error", async () => {
        const { result } = renderHook(() => useFormSubmit(async () => { throw new Error("x") }))
        await act(async () => { await result.current.submit() })
        act(() => result.current.setError(null))
        expect(result.current.error).toBeNull()
    })

    it("is busy while it works and ignores a second submit", async () => {
        let finish!: () => void
        const action = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
        const { result } = renderHook(() => useFormSubmit(action))
        let first!: Promise<void>
        act(() => { first = result.current.submit() as Promise<void> })
        expect(result.current.busy).toBe(true)
        await act(async () => { await result.current.submit() })
        expect(action).toHaveBeenCalledTimes(1)
        await act(async () => { finish(); await first })
        expect(result.current.busy).toBe(false)
    })
})
