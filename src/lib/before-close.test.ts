import { describe, expect, it, vi } from "vitest"
import { registerBeforeClose, runBeforeClose } from "./before-close"

describe("before-close", () => {
    it("waits for every registered handler", async () => {
        const done: string[] = []
        const stopA = registerBeforeClose(async () => { await Promise.resolve(); done.push("a") })
        const stopB = registerBeforeClose(() => { done.push("b") })

        await runBeforeClose()
        expect(done.sort()).toEqual(["a", "b"])
        stopA()
        stopB()
    })

    it("a failing handler does not stop the others and its error is reported", async () => {
        const error = new Error("fail")
        const ok = vi.fn()
        const stopA = registerBeforeClose(() => { throw error })
        const stopB = registerBeforeClose(ok)
        const onError = vi.fn()

        await runBeforeClose(onError)
        expect(onError).toHaveBeenCalledWith(error)
        expect(ok).toHaveBeenCalled()
        stopA()
        stopB()
    })

    it("a handler that was unregistered does not run", async () => {
        const handler = vi.fn()
        registerBeforeClose(handler)()

        await runBeforeClose()
        expect(handler).not.toHaveBeenCalled()
    })
})
