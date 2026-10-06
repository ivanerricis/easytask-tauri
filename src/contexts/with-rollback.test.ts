import { describe, expect, it, vi } from "vitest"
import { withRollback } from "./with-rollback"

describe("withRollback", () => {
    it("returns the result of the write and keeps the update", async () => {
        const rollback = vi.fn()
        await expect(withRollback(rollback, async () => 5)).resolves.toBe(5)
        expect(rollback).not.toHaveBeenCalled()
    })

    it("rolls back and rethrows when the write fails", async () => {
        const rollback = vi.fn()
        await expect(withRollback(rollback, () => Promise.reject(new Error("boom")))).rejects.toThrow("boom")
        expect(rollback).toHaveBeenCalledTimes(1)
    })

    it("accepts a missing rollback", async () => {
        await expect(withRollback(null, () => Promise.reject(new Error("x")))).rejects.toThrow("x")
        await expect(withRollback(undefined, async () => 1)).resolves.toBe(1)
    })
})
