import { beforeEach, describe, expect, it, vi } from "vitest"

const invoke = vi.fn()
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }))

import { ensureAppFolder, isPortable, resetAppPathsCache } from "./appPaths"

beforeEach(() => {
    resetAppPathsCache()
    invoke.mockReset()
})

describe("ensureAppFolder", () => {
    it("asks the Rust side once and caches the folder", async () => {
        invoke.mockResolvedValue("C:\\Data\\EasyTask")
        expect(await ensureAppFolder()).toBe("C:\\Data\\EasyTask")
        expect(await ensureAppFolder()).toBe("C:\\Data\\EasyTask")
        expect(invoke).toHaveBeenCalledTimes(1)
        expect(invoke).toHaveBeenCalledWith("data_dir")
    })

    it("does not cache a failure", async () => {
        invoke.mockRejectedValueOnce("boom").mockResolvedValueOnce("/data")
        await expect(ensureAppFolder()).rejects.toBe("boom")
        await expect(ensureAppFolder()).resolves.toBe("/data")
    })
})

describe("isPortable", () => {
    it("caches the answer", async () => {
        invoke.mockResolvedValue(true)
        expect(await isPortable()).toBe(true)
        expect(await isPortable()).toBe(true)
        expect(invoke).toHaveBeenCalledTimes(1)
        expect(invoke).toHaveBeenCalledWith("is_portable")
    })

    it("does not cache a failure", async () => {
        invoke.mockRejectedValueOnce("boom").mockResolvedValueOnce(false)
        await expect(isPortable()).rejects.toBe("boom")
        await expect(isPortable()).resolves.toBe(false)
    })
})
