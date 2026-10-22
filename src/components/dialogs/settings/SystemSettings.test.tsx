import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { SystemSettings } from "./SystemSettings"

const isEnabled = vi.fn()
const enable = vi.fn()
const disable = vi.fn()
const saveCloseToTray = vi.fn()
const notifyCloseToTrayChanged = vi.fn()
let closeToTray = false

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@tauri-apps/plugin-autostart", () => ({
    isEnabled: () => isEnabled(),
    enable: () => enable(),
    disable: () => disable(),
}))
vi.mock("@/lib/store/preferences", () => ({
    getCloseToTray: async () => closeToTray,
    saveCloseToTray: (...a: unknown[]) => saveCloseToTray(...a),
}))
vi.mock("@/lib/tray", () => ({ notifyCloseToTrayChanged: (...a: unknown[]) => notifyCloseToTrayChanged(...a) }))

beforeEach(() => {
    vi.clearAllMocks()
    closeToTray = false
    isEnabled.mockResolvedValue(false)
    enable.mockResolvedValue(undefined)
    disable.mockResolvedValue(undefined)
    saveCloseToTray.mockResolvedValue(undefined)
})

describe("SystemSettings", () => {
    it("reads the autostart state from the system and toggles it", async () => {
        isEnabled.mockResolvedValue(true)
        const user = userEvent.setup()
        render(<SystemSettings />)
        const autostart = screen.getByRole("switch", { name: "Avvia con Windows" })
        await waitFor(() => expect(autostart).toBeChecked())
        await user.click(autostart)
        expect(disable).toHaveBeenCalled()
        expect(autostart).not.toBeChecked()
        await user.click(autostart)
        expect(enable).toHaveBeenCalled()
    })

    it("reverts the switch and shows a toast when the system refuses", async () => {
        enable.mockRejectedValue(new Error("denied"))
        const user = userEvent.setup()
        render(<SystemSettings />)
        const autostart = screen.getByRole("switch", { name: "Avvia con Windows" })
        await waitFor(() => expect(autostart).toBeEnabled())
        await user.click(autostart)
        await waitFor(() => expect(toast.error).toHaveBeenCalled())
        expect(autostart).not.toBeChecked()
    })

    it("saves close to the notification area and tells the app", async () => {
        const user = userEvent.setup()
        render(<SystemSettings />)
        const toggle = screen.getByRole("switch", { name: "Riduci nell'area di notifica" })
        await user.click(toggle)
        expect(saveCloseToTray).toHaveBeenCalledWith(true)
        expect(notifyCloseToTrayChanged).toHaveBeenCalledWith(true)
        expect(toggle).toBeChecked()
    })
})
