import { beforeEach, describe, expect, it, vi } from "vitest"
import { toastMock } from "@/test/mocks"

vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
const purge = vi.fn()
vi.mock("@/db/queries/trash", () => ({ purgeDBTrashOlderThan: (...a: unknown[]) => purge(...a) }))
const getDays = vi.fn()
vi.mock("@/lib/store/preferences", () => ({ getTrashAutoEmptyDays: () => getDays() }))
const reportError = vi.fn()
vi.mock("@/lib/report-error", () => ({ reportError: (...a: unknown[]) => reportError(...a), resetReportErrorDedupe: () => {} }))

import { runTrashAutoEmpty } from "./trash-auto-empty"

beforeEach(() => {
    toastMock.success.mockReset()
    purge.mockReset().mockResolvedValue(0)
    getDays.mockReset().mockResolvedValue(30)
    reportError.mockReset()
})

describe("runTrashAutoEmpty", () => {
    it("does nothing when the preference is never", async () => {
        getDays.mockResolvedValue(0)
        await runTrashAutoEmpty()
        expect(purge).not.toHaveBeenCalled()
        expect(toastMock.success).not.toHaveBeenCalled()
    })

    it("purges with the chosen days and tells how many items went", async () => {
        purge.mockResolvedValue(3)
        await runTrashAutoEmpty()
        expect(purge).toHaveBeenCalledWith(30)
        expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("3"))
        expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("30"))
    })

    it("stays silent when nothing was deleted", async () => {
        await runTrashAutoEmpty()
        expect(purge).toHaveBeenCalledWith(30)
        expect(toastMock.success).not.toHaveBeenCalled()
    })

    it("only reports a failure", async () => {
        const error = new Error("boom")
        purge.mockRejectedValue(error)
        await expect(runTrashAutoEmpty()).resolves.toBeUndefined()
        expect(reportError).toHaveBeenCalledWith(error)
        expect(toastMock.success).not.toHaveBeenCalled()
    })
})
