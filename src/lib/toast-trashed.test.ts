import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { ACTION_TOAST_DURATION, toastTrashed } from "./toast-trashed"

vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
describe("toastTrashed", () => {
    beforeEach(() => vi.clearAllMocks())

    it("keeps the toast with the undo button longer than the default", () => {
        toastTrashed(1, async () => undefined)
        expect(ACTION_TOAST_DURATION).toBeGreaterThan(3000)
        expect(toast.success).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ duration: ACTION_TOAST_DURATION }))
    })

    it("leaves the default duration when there is nothing to undo", () => {
        toastTrashed(2)
        expect(toast.success).toHaveBeenCalledWith(expect.any(String), undefined)
    })

    it("says only that the item is deleted in a template draft, still with the undo button", () => {
        toastTrashed(2, async () => undefined, true)
        expect(toast.success).toHaveBeenCalledWith("Eliminato", expect.objectContaining({ action: expect.objectContaining({ label: expect.any(String) }) }))
    })
})