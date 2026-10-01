import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { saveCheckUpdatesOnStartup } from "@/lib/store/preferences"
import { OPEN_SETTINGS_EVENT, runStartupUpdateCheck } from "./updater"

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

    it("shows a toast whose action opens the About page", async () => {
        check.mockResolvedValue({ version: "2.0.0" })
        const listener = vi.fn()
        window.addEventListener(OPEN_SETTINGS_EVENT, listener)
        await runStartupUpdateCheck()
        expect(toast).toHaveBeenCalledTimes(1)
        const [message, options] = vi.mocked(toast).mock.calls[0] as unknown as [string, { action: { onClick: () => void } }]
        expect(message).toContain("2.0.0")
        options.action.onClick()
        expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ category: "about" })
        window.removeEventListener(OPEN_SETTINGS_EVENT, listener)
    })

    it("does nothing when the preference is off", async () => {
        await saveCheckUpdatesOnStartup(false)
        expect(await runStartupUpdateCheck()).toBeNull()
        expect(check).not.toHaveBeenCalled()
    })
})
