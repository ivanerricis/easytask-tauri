import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { saveCheckUpdatesOnStartup, saveSkippedUpdateVersion } from "@/lib/store/preferences"
import { runStartupUpdateCheck, UPDATE_AVAILABLE_EVENT } from "./updater"

const check = vi.fn()
const isPortable = vi.fn()

vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => check() }))
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }))
vi.mock("@/db/appPaths", () => ({ isPortable: () => isPortable() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))

beforeEach(() => {
    check.mockReset()
    isPortable.mockReset().mockResolvedValue(false)
    vi.mocked(toast).mockClear()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
})

describe("runStartupUpdateCheck", () => {
    it("stays silent when up to date", async () => {
        check.mockResolvedValue(null)
        expect(await runStartupUpdateCheck()).toBeNull()
        expect(toast).not.toHaveBeenCalled()
    })

    it("never throws nor shows an error when the check fails (offline, placeholder key)", async () => {
        check.mockRejectedValue(new Error("offline"))
        await expect(runStartupUpdateCheck()).resolves.toBeNull()
        expect(toast).not.toHaveBeenCalled()
        expect(toast.error).not.toHaveBeenCalled()
    })

    it("announces the update to the update dialog, with the portable flag", async () => {
        const update = { version: "2.0.0" }
        check.mockResolvedValue(update)
        isPortable.mockResolvedValue(true)
        const listener = vi.fn()
        window.addEventListener(UPDATE_AVAILABLE_EVENT, listener)
        expect(await runStartupUpdateCheck()).toBe(update)
        expect(listener).toHaveBeenCalledTimes(1)
        expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ update, portable: true })
        expect(toast).not.toHaveBeenCalled()
        window.removeEventListener(UPDATE_AVAILABLE_EVENT, listener)
    })

    it("does not announce a version the user skipped, but does announce a newer one", async () => {
        await saveSkippedUpdateVersion("2.0.0")
        const listener = vi.fn()
        window.addEventListener(UPDATE_AVAILABLE_EVENT, listener)
        check.mockResolvedValue({ version: "2.0.0" })
        expect(await runStartupUpdateCheck()).toBeNull()
        expect(listener).not.toHaveBeenCalled()
        check.mockResolvedValue({ version: "2.1.0" })
        await runStartupUpdateCheck()
        expect(listener).toHaveBeenCalledTimes(1)
        window.removeEventListener(UPDATE_AVAILABLE_EVENT, listener)
        await saveSkippedUpdateVersion(null)
    })

    it("does nothing when the preference is off", async () => {
        await saveCheckUpdatesOnStartup(false)
        expect(await runStartupUpdateCheck()).toBeNull()
        expect(check).not.toHaveBeenCalled()
    })
})
