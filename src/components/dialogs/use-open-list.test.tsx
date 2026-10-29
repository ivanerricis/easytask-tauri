import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useOpenList } from "./use-open-list"

const toastSuccess = vi.fn()
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }))

type Item = { id: number, type: "a" | "b" }

const setup = (load: () => Promise<Item[]>, isOpen = true) =>
    renderHook(({ open }) => useOpenList<Item, Item["type"]>({
        isOpen: open,
        load,
        firstSelected: list => list[0]?.type ?? "a",
    }), { initialProps: { open: isOpen } })

beforeEach(() => toastSuccess.mockReset())

describe("useOpenList", () => {
    it("does not load while closed", () => {
        const load = vi.fn().mockResolvedValue([])
        const { result } = setup(load, false)
        expect(load).not.toHaveBeenCalled()
        expect(result.current.isLoading).toBe(false)
    })

    it("loads when it opens and selects the first value", async () => {
        const load = vi.fn().mockResolvedValue([{ id: 1, type: "b" }])
        const { result } = setup(load)
        expect(result.current.isLoading).toBe(true)
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.items).toEqual([{ id: 1, type: "b" }])
        expect(result.current.selected).toBe("b")
    })

    it("keeps the selection the user made on later reloads", async () => {
        const load = vi.fn().mockResolvedValue([{ id: 1, type: "b" }])
        const { result } = setup(load)
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        act(() => result.current.setSelected("a"))
        await act(() => result.current.reload())
        expect(result.current.selected).toBe("a")
    })

    it("resets everything when it closes", async () => {
        const load = vi.fn().mockResolvedValue([{ id: 1, type: "b" }])
        const { result, rerender } = setup(load)
        await waitFor(() => expect(result.current.selected).toBe("b"))
        rerender({ open: false })
        expect(result.current.selected).toBeNull()
        rerender({ open: true })
        expect(result.current.isLoading).toBe(true)
        await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it("reports a failed load and retries it with reload", async () => {
        const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue([{ id: 2, type: "a" }])
        const { result } = setup(load)
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.loadError).toBe("boom")
        await act(() => result.current.reload())
        expect(result.current.loadError).toBeNull()
        expect(result.current.items).toHaveLength(1)
    })

    it("uses the latest load function", async () => {
        const first = vi.fn().mockResolvedValue([])
        const second = vi.fn().mockResolvedValue([{ id: 3, type: "a" }])
        const { result, rerender } = renderHook(({ load }) => useOpenList<Item>({ isOpen: true, load }), { initialProps: { load: first } })
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        rerender({ load: second })
        await act(() => result.current.reload())
        expect(result.current.items).toEqual([{ id: 3, type: "a" }])
    })

    describe("run", () => {
        it("runs the action, shows the toast, reloads and is busy meanwhile", async () => {
            const load = vi.fn().mockResolvedValue([])
            const { result } = setup(load)
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            let finish!: () => void
            const action = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
            let outcome!: Promise<boolean>
            act(() => { outcome = result.current.run(action, "done") })
            expect(result.current.busy).toBe(true)
            await act(async () => { finish(); await outcome })
            expect(await outcome).toBe(true)
            expect(toastSuccess).toHaveBeenCalledWith("done")
            expect(load).toHaveBeenCalledTimes(2)
            expect(result.current.busy).toBe(false)
        })

        it("shows the error of a failed action, still reloads and returns false", async () => {
            const load = vi.fn().mockResolvedValue([])
            const { result } = setup(load)
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            let ok = true
            await act(async () => { ok = await result.current.run(async () => { throw new Error("nope") }, "done") })
            expect(ok).toBe(false)
            expect(result.current.error).toBe("nope")
            expect(toastSuccess).not.toHaveBeenCalled()
            expect(load).toHaveBeenCalledTimes(2)
        })

        it("clears the previous error when it starts", async () => {
            const { result } = setup(vi.fn().mockResolvedValue([]))
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            await act(async () => { await result.current.run(async () => { throw new Error("nope") }) })
            expect(result.current.error).toBe("nope")
            await act(async () => { await result.current.run(async () => undefined) })
            expect(result.current.error).toBeNull()
        })

        it("an action that returns false has no toast", async () => {
            const { result } = setup(vi.fn().mockResolvedValue([]))
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            let ok = true
            await act(async () => { ok = await result.current.run(async () => false, "done") })
            expect(ok).toBe(false)
            expect(toastSuccess).not.toHaveBeenCalled()
        })

        it("can skip the reload", async () => {
            const load = vi.fn().mockResolvedValue([])
            const { result } = setup(load)
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            await act(async () => { await result.current.run(async () => undefined, undefined, { reload: false }) })
            expect(load).toHaveBeenCalledTimes(1)
        })

        it("ignores a call made while another one is running", async () => {
            const { result } = setup(vi.fn().mockResolvedValue([]))
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            let finish!: () => void
            const slow = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
            const second = vi.fn(async () => undefined)
            let first!: Promise<boolean>
            act(() => { first = result.current.run(slow) })
            let ignored = true
            await act(async () => { ignored = await result.current.run(second) })
            expect(ignored).toBe(false)
            expect(second).not.toHaveBeenCalled()
            await act(async () => { finish(); await first })
        })
    })
})
