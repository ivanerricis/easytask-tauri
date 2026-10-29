import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useOpenReleasesPage } from "./use-open-releases-page"

const openReleasesPage = vi.fn()
const toastError = vi.fn()
vi.mock("@/lib/updater", () => ({ openReleasesPage: () => openReleasesPage() }))
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }))

beforeEach(() => {
    openReleasesPage.mockReset()
    toastError.mockReset()
})

describe("useOpenReleasesPage", () => {
    it("opens the page without a toast", async () => {
        openReleasesPage.mockResolvedValue(undefined)
        const { result } = renderHook(() => useOpenReleasesPage())
        await result.current()
        expect(openReleasesPage).toHaveBeenCalledTimes(1)
        expect(toastError).not.toHaveBeenCalled()
    })

    it("shows an error toast with the reason when it cannot open", async () => {
        openReleasesPage.mockRejectedValue(new Error("nessun browser"))
        const { result } = renderHook(() => useOpenReleasesPage())
        await result.current()
        expect(toastError).toHaveBeenCalledTimes(1)
        expect(String(toastError.mock.calls[0][0])).toContain("nessun browser")
    })
})
