import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createDraftAutosaver } from "./template-draft"

describe("createDraftAutosaver", () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it("saves once after the quiet time, whatever the number of changes", async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const saver = createDraftAutosaver({ save, delay: 800 })

        saver.notify(1)
        await vi.advanceTimersByTimeAsync(500)
        saver.notify(1)
        await vi.advanceTimersByTimeAsync(500)
        expect(save).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(300)
        expect(save).toHaveBeenCalledTimes(1)
        expect(save).toHaveBeenCalledWith(1)
        expect(saver.getStatus(1)).toBe("saved")
        expect(saver.isDirty(1)).toBe(false)
    })

    it("is idle until the draft changes", () => {
        const saver = createDraftAutosaver({ save: vi.fn() })
        expect(saver.getStatus(1)).toBe("idle")
        expect(saver.isDirty(1)).toBe(false)
    })

    it("saves now on flush and the timer does not save again", async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const saver = createDraftAutosaver({ save })

        saver.notify(1)
        await expect(saver.flush(1)).resolves.toBe(true)
        expect(save).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(5000)
        expect(save).toHaveBeenCalledTimes(1)
    })

    it("flush of a draft that is not dirty does not save", async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const saver = createDraftAutosaver({ save })

        await expect(saver.flush(7)).resolves.toBe(true)
        saver.notify(1)
        await saver.flush(1)
        await expect(saver.flush(1)).resolves.toBe(true)
        expect(save).toHaveBeenCalledTimes(1)
    })

    it("waits for the writes in flight before saving", async () => {
        const order: string[] = []
        let release!: () => void
        const whenIdle = vi.fn(() => new Promise<void>(resolve => { release = () => { order.push("idle"); resolve() } }))
        const save = vi.fn(async () => { order.push("save") })
        const saver = createDraftAutosaver({ save, whenIdle })

        saver.notify(1)
        const flushed = saver.flush(1)
        await vi.advanceTimersByTimeAsync(0)
        expect(save).not.toHaveBeenCalled()

        release()
        await flushed
        expect(order).toEqual(["idle", "save"])
    })

    it("keeps the draft dirty after a failed save and saves again on retry", async () => {
        const save = vi.fn().mockRejectedValueOnce(new Error("disk")).mockResolvedValue(undefined)
        const saver = createDraftAutosaver({ save })

        saver.notify(1)
        await expect(saver.flush(1)).resolves.toBe(false)
        expect(saver.getStatus(1)).toBe("error")
        expect(saver.isDirty(1)).toBe(true)

        await expect(saver.retry(1)).resolves.toBe(true)
        expect(saver.getStatus(1)).toBe("saved")
        expect(saver.isDirty(1)).toBe(false)
        expect(save).toHaveBeenCalledTimes(2)
    })

    it("a change made during a save is saved by the next run", async () => {
        let release!: () => void
        const save = vi.fn()
            .mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve }))
            .mockResolvedValue(undefined)
        const saver = createDraftAutosaver({ save, delay: 100 })

        saver.notify(1)
        await vi.advanceTimersByTimeAsync(100)
        expect(save).toHaveBeenCalledTimes(1)

        saver.notify(1)
        release()
        await vi.advanceTimersByTimeAsync(0)
        expect(saver.isDirty(1)).toBe(true)

        await vi.advanceTimersByTimeAsync(100)
        expect(save).toHaveBeenCalledTimes(2)
        expect(saver.getStatus(1)).toBe("saved")
    })

    it("saves the drafts one after the other, each one in order", async () => {
        let running = 0
        let overlap = false
        const save = vi.fn(async () => {
            running += 1
            if (running > 1) overlap = true
            await new Promise(resolve => setTimeout(resolve, 10))
            running -= 1
        })
        const saver = createDraftAutosaver({ save })

        saver.notify(1)
        const first = saver.flush(1)
        await vi.advanceTimersByTimeAsync(0) // the first save is running
        saver.notify(1)
        const second = saver.flush(1)
        await vi.advanceTimersByTimeAsync(50)
        await Promise.all([first, second])
        expect(overlap).toBe(false)
        expect(save).toHaveBeenCalledTimes(2)
    })

    it("flushAll saves every dirty draft and reports a failure", async () => {
        const save = vi.fn(async (key: number) => { if (key === 2) throw new Error("no") })
        const saver = createDraftAutosaver({ save })

        saver.notify(1)
        saver.notify(2)
        await expect(saver.flushAll()).resolves.toBe(false)
        expect(save).toHaveBeenCalledTimes(2)
        expect(saver.getStatus(1)).toBe("saved")
        expect(saver.getStatus(2)).toBe("error")
    })

    it("forget drops the draft and cancels its timer", async () => {
        const save = vi.fn().mockResolvedValue(undefined)
        const saver = createDraftAutosaver({ save })

        saver.notify(1)
        saver.forget(1)
        await vi.advanceTimersByTimeAsync(5000)
        expect(save).not.toHaveBeenCalled()
        expect(saver.getStatus(1)).toBe("idle")
        await expect(saver.flush(1)).resolves.toBe(true)
    })

    it("tells the listeners when a status changes", async () => {
        const saver = createDraftAutosaver({ save: vi.fn().mockResolvedValue(undefined) })
        const listener = vi.fn()
        const stop = saver.subscribe(listener)

        saver.notify(1)
        await saver.flush(1)
        const calls = listener.mock.calls.length
        expect(calls).toBeGreaterThanOrEqual(2) // saving, saved

        stop()
        saver.notify(1)
        await saver.flush(1)
        expect(listener.mock.calls.length).toBe(calls)
    })
})
