import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useOpenDataFolder } from "./use-open-data-folder"

const invoke = vi.fn()
let failure: Error | null = null
// The failure is thrown by the stand-in itself: a rejecting vi.fn() is reported by the runner as an error of the test
vi.mock("@tauri-apps/api/core", () => ({
    invoke: async (...a: unknown[]) => {
        invoke(...a)
        if (failure) throw failure
    },
}))

beforeEach(() => {
    invoke.mockReset()
    failure = null
})

describe("useOpenDataFolder", () => {
    it("opens the data folder, clearing the previous error", async () => {
        const setError = vi.fn()
        const { result } = renderHook(() => useOpenDataFolder(setError))
        await result.current()
        expect(invoke).toHaveBeenCalledWith("open_data_folder")
        expect(setError).toHaveBeenCalledTimes(1)
        expect(setError).toHaveBeenCalledWith(null)
    })

    it("opens a subfolder", async () => {
        const { result } = renderHook(() => useOpenDataFolder(vi.fn(), "backups"))
        await result.current()
        expect(invoke).toHaveBeenCalledWith("open_data_folder", { subfolder: "backups" })
    })

    it("hands over the message when it fails", async () => {
        failure = new Error("no explorer")
        const setError = vi.fn()
        const { result } = renderHook(() => useOpenDataFolder(setError))
        await result.current()
        expect(setError).toHaveBeenLastCalledWith("no explorer")
    })
})
