import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { useCloseToTray } from "./use-close-to-tray"

const mocks = vi.hoisted(() => ({
    getCloseToTray: vi.fn<() => Promise<boolean>>(),
    createTray: vi.fn(),
    hideMainWindow: vi.fn(),
    setCloseToTrayActive: vi.fn(),
    onCloseRequested: vi.fn(),
    reportError: vi.fn(),
}))

vi.mock("@/lib/store/preferences", () => ({ getCloseToTray: mocks.getCloseToTray }))
// The global test setup also needs resetReportErrorDedupe from the real module
vi.mock("@/lib/report-error", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/report-error")>(), reportError: mocks.reportError }))
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ onCloseRequested: mocks.onCloseRequested }) }))
vi.mock("@/lib/tray", () => ({
    CLOSE_TO_TRAY_EVENT: "easytask:close-to-tray",
    createTray: mocks.createTray,
    hideMainWindow: mocks.hideMainWindow,
    setCloseToTrayActive: mocks.setCloseToTrayActive,
}))

type FakeTray = { update: ReturnType<typeof vi.fn>, dispose: ReturnType<typeof vi.fn> }

const makeTray = (): FakeTray => ({ update: vi.fn().mockResolvedValue(undefined), dispose: vi.fn().mockResolvedValue(undefined) })

function Host() {
    useCloseToTray()
    return null
}

const setSetting = (value: boolean) => act(async () => {
    window.dispatchEvent(new CustomEvent<boolean>("easytask:close-to-tray", { detail: value }))
})

describe("useCloseToTray", () => {
    let trays: FakeTray[]
    let unlistenClose: ReturnType<typeof vi.fn>
    let closeHandler: ((event: { preventDefault: () => void }) => void) | undefined

    beforeEach(() => {
        vi.clearAllMocks()
        trays = []
        closeHandler = undefined
        unlistenClose = vi.fn()
        mocks.getCloseToTray.mockResolvedValue(false)
        mocks.createTray.mockImplementation(async () => {
            const tray = makeTray()
            trays.push(tray)
            return tray
        })
        mocks.hideMainWindow.mockResolvedValue(undefined)
        mocks.onCloseRequested.mockImplementation(async (handler: typeof closeHandler) => {
            closeHandler = handler
            return unlistenClose
        })
    })

    it("shows nothing while the setting is off", async () => {
        render(<Host />)
        await waitFor(() => expect(mocks.getCloseToTray).toHaveBeenCalled())
        await act(async () => { })
        expect(mocks.createTray).not.toHaveBeenCalled()
        expect(mocks.onCloseRequested).not.toHaveBeenCalled()
        expect(mocks.setCloseToTrayActive).not.toHaveBeenCalled()
    })

    it("shows the icon with the translated texts when the setting is on at startup", async () => {
        mocks.getCloseToTray.mockResolvedValue(true)
        render(<Host />)
        await waitFor(() => expect(mocks.setCloseToTrayActive).toHaveBeenCalledWith(true))
        expect(trays).toHaveLength(1)
        expect(mocks.createTray).toHaveBeenCalledWith({
            tooltip: i18n.t("settings.system.tray.tooltip"),
            open: i18n.t("settings.system.tray.open"),
            quit: i18n.t("settings.system.tray.quit"),
        })
    })

    it("hides the window instead of closing it", async () => {
        mocks.getCloseToTray.mockResolvedValue(true)
        render(<Host />)
        await waitFor(() => expect(closeHandler).toBeDefined())
        const preventDefault = vi.fn()
        closeHandler!({ preventDefault })
        expect(preventDefault).toHaveBeenCalledTimes(1)
        expect(mocks.hideMainWindow).toHaveBeenCalledTimes(1)
    })

    it("reports a failure to hide the window", async () => {
        mocks.getCloseToTray.mockResolvedValue(true)
        const failure = new Error("cannot hide")
        mocks.hideMainWindow.mockRejectedValue(failure)
        render(<Host />)
        await waitFor(() => expect(closeHandler).toBeDefined())
        closeHandler!({ preventDefault: vi.fn() })
        await waitFor(() => expect(mocks.reportError).toHaveBeenCalledWith(failure))
    })

    it("turns the icon on and off when the setting changes", async () => {
        render(<Host />)
        await waitFor(() => expect(mocks.getCloseToTray).toHaveBeenCalled())

        await setSetting(true)
        await waitFor(() => expect(mocks.setCloseToTrayActive).toHaveBeenLastCalledWith(true))
        expect(trays).toHaveLength(1)

        await setSetting(false)
        await waitFor(() => expect(trays[0].dispose).toHaveBeenCalledTimes(1))
        expect(mocks.setCloseToTrayActive).toHaveBeenLastCalledWith(false)
        expect(unlistenClose).toHaveBeenCalledTimes(1)
    })

    it("never leaves two icons after a quick off and on", async () => {
        mocks.getCloseToTray.mockResolvedValue(true)
        render(<Host />)
        await waitFor(() => expect(trays).toHaveLength(1))

        await act(async () => {
            window.dispatchEvent(new CustomEvent<boolean>("easytask:close-to-tray", { detail: false }))
            window.dispatchEvent(new CustomEvent<boolean>("easytask:close-to-tray", { detail: true }))
        })
        await waitFor(() => expect(trays).toHaveLength(2))
        expect(trays[0].dispose).toHaveBeenCalledTimes(1)
        expect(trays[1].dispose).not.toHaveBeenCalled()
    })

    it("applies the new language to the icon", async () => {
        mocks.getCloseToTray.mockResolvedValue(true)
        render(<Host />)
        await waitFor(() => expect(trays).toHaveLength(1))

        await act(async () => { await i18n.changeLanguage("en") })
        await waitFor(() => expect(trays[0].update).toHaveBeenCalledWith({
            tooltip: i18n.t("settings.system.tray.tooltip"),
            open: i18n.t("settings.system.tray.open"),
            quit: i18n.t("settings.system.tray.quit"),
        }))
    })

    it("removes the icon and the listener when it unmounts", async () => {
        mocks.getCloseToTray.mockResolvedValue(true)
        const view = render(<Host />)
        await waitFor(() => expect(trays).toHaveLength(1))

        view.unmount()
        await waitFor(() => expect(trays[0].dispose).toHaveBeenCalledTimes(1))
        expect(unlistenClose).toHaveBeenCalledTimes(1)
        expect(mocks.setCloseToTrayActive).toHaveBeenLastCalledWith(false)

        // The setting is no longer followed
        await setSetting(true)
        expect(trays).toHaveLength(1)
    })

    it("ignores the stored setting when it unmounts before it is read", async () => {
        let resolve!: (value: boolean) => void
        mocks.getCloseToTray.mockReturnValue(new Promise<boolean>(r => { resolve = r }))
        const view = render(<Host />)
        view.unmount()
        await act(async () => { resolve(true) })
        expect(mocks.createTray).not.toHaveBeenCalled()
    })

    it("reports an error when the setting cannot be read", async () => {
        const failure = new Error("store unavailable")
        mocks.getCloseToTray.mockRejectedValue(failure)
        render(<Host />)
        await waitFor(() => expect(mocks.reportError).toHaveBeenCalledWith(failure))
        expect(mocks.createTray).not.toHaveBeenCalled()
    })
})
