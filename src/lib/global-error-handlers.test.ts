import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sonner = vi.hoisted(() => ({ toast: { error: vi.fn() } }))
vi.mock("sonner", () => sonner)

import { installGlobalErrorHandlers } from "./global-error-handlers"

describe("installGlobalErrorHandlers", () => {
    let remove: () => void

    beforeEach(() => {
        sonner.toast.error.mockClear()
        vi.spyOn(console, "error").mockImplementation(() => { })
        remove = installGlobalErrorHandlers()
    })
    afterEach(() => {
        remove()
        vi.restoreAllMocks()
    })

    it("reports an uncaught error with a translated toast", () => {
        window.dispatchEvent(new ErrorEvent("error", { message: "boom", error: new Error("boom") }))
        expect(console.error).toHaveBeenCalled()
        expect(sonner.toast.error).toHaveBeenCalledWith("Si è verificato un errore imprevisto")
    })

    it("reports an unhandled rejection", () => {
        const event = new Event("unhandledrejection") as Event & { reason: unknown }
        event.reason = new Error("nope")
        window.dispatchEvent(event)
        expect(sonner.toast.error).toHaveBeenCalledWith("Un'operazione è fallita in modo imprevisto")
    })

    it("ignores the benign ResizeObserver notifications", () => {
        window.dispatchEvent(new ErrorEvent("error", { message: "ResizeObserver loop completed with undelivered notifications." }))
        expect(sonner.toast.error).not.toHaveBeenCalled()
        expect(console.error).not.toHaveBeenCalled()
    })

    it("shows a repeated error only once", () => {
        const fire = () => window.dispatchEvent(new ErrorEvent("error", { message: "x", error: new Error("x") }))
        fire(); fire()
        expect(sonner.toast.error).toHaveBeenCalledTimes(1)
    })

    it("stops reporting once removed", () => {
        remove()
        const event = new Event("unhandledrejection") as Event & { reason: unknown }
        event.reason = new Error("late")
        window.dispatchEvent(event)
        expect(sonner.toast.error).not.toHaveBeenCalled()
    })
})
