import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { reportError } from "./report-error"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

describe("reportError", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
        vi.spyOn(console, "error").mockImplementation(() => undefined)
        vi.mocked(toast.error).mockClear()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it("logs the error without a toast when no user message is given", () => {
        const err = new Error("boom")
        reportError(err)
        expect(console.error).toHaveBeenCalledWith("", err)
        expect(toast.error).not.toHaveBeenCalled()
    })

    it("logs and shows a toast when a user message is given", () => {
        const err = new Error("boom")
        reportError(err, "Messaggio A")
        expect(console.error).toHaveBeenCalledWith(expect.any(String), err)
        expect(toast.error).toHaveBeenCalledWith("Messaggio A")
    })

    it("deduplicates identical toasts within the window but always logs", () => {
        reportError(new Error("1"), "Messaggio B")
        reportError(new Error("2"), "Messaggio B")
        expect(toast.error).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledTimes(2)
    })

    it("shows the toast again after the window has elapsed", () => {
        reportError(new Error("1"), "Messaggio C")
        vi.advanceTimersByTime(2500)
        reportError(new Error("2"), "Messaggio C")
        expect(toast.error).toHaveBeenCalledTimes(2)
    })

    it("does not dedupe different messages", () => {
        reportError(new Error("1"), "Messaggio D")
        reportError(new Error("2"), "Messaggio E")
        expect(toast.error).toHaveBeenCalledTimes(2)
    })
})
