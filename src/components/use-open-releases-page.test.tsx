import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toastMock } from "@/test/mocks"
import { useOpenReleasesPage } from "./use-open-releases-page"

const openReleasesPage = vi.fn()
vi.mock("@/lib/updater", () => ({ openReleasesPage: () => openReleasesPage() }))
vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())

beforeEach(() => {
    openReleasesPage.mockReset()
    toastMock.error.mockReset()
})

describe("useOpenReleasesPage", () => {
    it("opens the page without a toast", async () => {
        openReleasesPage.mockResolvedValue(undefined)
        const { result } = renderHook(() => useOpenReleasesPage())
        await result.current()
        expect(openReleasesPage).toHaveBeenCalledTimes(1)
        expect(toastMock.error).not.toHaveBeenCalled()
    })

    it("shows an error toast with the reason when it cannot open", async () => {
        openReleasesPage.mockRejectedValue(new Error("nessun browser"))
        const { result } = renderHook(() => useOpenReleasesPage())
        await result.current()
        expect(toastMock.error).toHaveBeenCalledTimes(1)
        expect(String(toastMock.error.mock.calls[0][0])).toContain("nessun browser")
    })
})
