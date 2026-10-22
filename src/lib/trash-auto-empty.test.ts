import { beforeEach, describe, expect, it, vi } from "vitest"

const toastSuccess = vi.fn()
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }))
const purge = vi.fn()
vi.mock("@/db/queries/trash", () => ({ purgeDBTrashOlderThan: (...a: unknown[]) => purge(...a) }))
const getDays = vi.fn()
vi.mock("@/lib/store/preferences", () => ({ getTrashAutoEmptyDays: () => getDays() }))
const reportError = vi.fn()
vi.mock("@/lib/report-error", () => ({ reportError: (...a: unknown[]) => reportError(...a), resetReportErrorDedupe: () => {} }))

import { runTrashAutoEmpty } from "./trash-auto-empty"

beforeEach(() => {
    toastSuccess.mockReset()
    purge.mockReset().mockResolvedValue(0)
    getDays.mockReset().mockResolvedValue(30)
    reportError.mockReset()
})

describe("runTrashAutoEmpty", () => {
    it("does nothing when the preference is never", async () => {
        getDays.mockResolvedValue(0)
        await runTrashAutoEmpty()
        expect(purge).not.toHaveBeenCalled()
        expect(toastSuccess).not.toHaveBeenCalled()
    })

    it("purges with the chosen days and tells how many items went", async () => {
        purge.mockResolvedValue(3)
        await runTrashAutoEmpty()
        expect(purge).toHaveBeenCalledWith(30)
        expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("3"))
        expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("30"))
    })

    it("stays silent when nothing was deleted", async () => {
        await runTrashAutoEmpty()
        expect(purge).toHaveBeenCalledWith(30)
        expect(toastSuccess).not.toHaveBeenCalled()
    })

    it("only reports a failure", async () => {
        const error = new Error("boom")
        purge.mockRejectedValue(error)
        await expect(runTrashAutoEmpty()).resolves.toBeUndefined()
        expect(reportError).toHaveBeenCalledWith(error)
        expect(toastSuccess).not.toHaveBeenCalled()
    })
})
