import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { openUrl } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"
const setSidebarItemSize = vi.fn()
const setColorIntensity = vi.fn()
const setHideCompletedTasks = vi.fn()
const colorPrefs = { colorIntensity: 1 }
const audioPrefs = {
    setAudioVolume: vi.fn(),
    setAudioPlayerVisible: vi.fn(),
    setAudioPlayerScale: vi.fn(),
    setAudioPlayerOpacity: vi.fn(),
    resetAudioSettings: vi.fn(),
}
import { DialogSettings } from "./dialog-settings"

vi.mock("@tauri-apps/api/app", () => ({
    getName: vi.fn().mockResolvedValue("EasyTask"),
    getVersion: vi.fn().mockResolvedValue("9.8.7"),
    getTauriVersion: vi.fn().mockResolvedValue("2.1.0"),
}))
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/db/appPaths", () => ({
    ensureAppFolder: vi.fn().mockResolvedValue("C:\\Docs\\EasyTask"),
    isPortable: vi.fn().mockResolvedValue(false),
}))
vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn().mockResolvedValue(null) }))
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }))
vi.mock("@/components/mode-toggle", () => ({ ModeToggle: () => <div>mode-toggle</div> }))
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({
        primaryColor: "#000000", setPrimaryColor: vi.fn(),
        showProgressBar: true, setShowProgressBar: vi.fn(),
        showGroupProgressBar: true, setShowGroupProgressBar: vi.fn(),
        showSectionCount: true, setShowSectionCount: vi.fn(),
        showTaskCount: true, setShowTaskCount: vi.fn(),
        showAudioFileCount: true, setShowAudioFileCount: vi.fn(),
        showGroupSeparators: false, setShowGroupSeparators: vi.fn(),
        undoLimit: 50, setUndoLimit: vi.fn(),
        hideCompletedTasks: false, setHideCompletedTasks: (value: boolean) => setHideCompletedTasks(value),
        reopenNotes: true, setReopenNotes: vi.fn(),
        reopenLastWorkspace: false, setReopenLastWorkspace: vi.fn(),
        resetPlayerPosition: vi.fn(),
        audioVolume: 0.5, setAudioVolume: (value: number) => audioPrefs.setAudioVolume(value),
        audioPlayerVisible: true, setAudioPlayerVisible: (value: boolean) => audioPrefs.setAudioPlayerVisible(value),
        audioPlayerScale: 1, setAudioPlayerScale: (value: number) => audioPrefs.setAudioPlayerScale(value),
        audioPlayerOpacity: 0.8, setAudioPlayerOpacity: (value: number) => audioPrefs.setAudioPlayerOpacity(value),
        resetAudioSettings: () => audioPrefs.resetAudioSettings(),
        colorIntensity: colorPrefs.colorIntensity, setColorIntensity: (value: number) => setColorIntensity(value),
        sidebarItemSize: "normal", setSidebarItemSize: (value: string) => setSidebarItemSize(value),
    }),
}))

const open = async () => {
    const user = userEvent.setup()
    render(<DialogSettings />)
    await user.click(screen.getByRole("button"))
    // The dialog content is a lazy chunk
    await screen.findByRole("dialog", {}, { timeout: 5000 })
    return user
}

describe("DialogSettings", () => {
    // Warm the lazy chunk so the first test does not pay for the import
    beforeAll(async () => { await import("./dialog-settings-content") })

    beforeEach(() => {
        setSidebarItemSize.mockReset()
        setColorIntensity.mockReset()
        setHideCompletedTasks.mockReset()
        colorPrefs.colorIntensity = 1
        vi.mocked(openUrl).mockReset().mockResolvedValue(undefined)
        vi.mocked(toast.error).mockReset()
    })

    it("shows Aspetto first and switches panels", async () => {
        const user = await open()
        expect(screen.getByRole("heading", { name: "Aspetto" })).toBeInTheDocument()
        expect(screen.getByRole("tab", { name: "Aspetto" })).toHaveAttribute("aria-selected", "true")

        await user.click(screen.getByRole("tab", { name: "Note e sezioni" }))
        expect(screen.getByRole("heading", { name: "Note e sezioni" })).toBeInTheDocument()
        expect(screen.getByLabelText("Mostra numero di task")).toBeInTheDocument()
        expect(screen.getAllByRole("switch")).toHaveLength(10)
        expect(screen.getByRole("switch", { name: "Nascondi i task completati" })).not.toBeChecked()
        expect(screen.getByRole("switch", { name: "Mostra barra d'avanzamento nei gruppi" })).toBeChecked()
        expect(screen.getByLabelText("Riapri le note all'avvio")).toBeChecked()

        await user.click(screen.getByRole("tab", { name: "Audio" }))
        expect(screen.getByRole("button", { name: "Ripristina" })).toBeInTheDocument()
    })

    it("puts the reset of a section in the same place everywhere: in its title row, on the right", async () => {
        const user = await open()
        for (const section of ["Aspetto", "Audio"]) {
            await user.click(screen.getByRole("tab", { name: section }))
            const heading = screen.getByRole("heading", { name: section })
            const reset = screen.getByRole("button", { name: "Ripristina tutto" })
            // The button sits in a span that carries its tooltip
            expect(reset.parentElement?.parentElement).toBe(heading.parentElement)
            expect(heading.parentElement?.lastElementChild).toBe(reset.parentElement)
        }
    })

    it("toggles the hide completed tasks preference", async () => {
        const user = await open()
        await user.click(screen.getByRole("tab", { name: "Note e sezioni" }))
        await user.click(screen.getByRole("switch", { name: "Nascondi i task completati" }))
        expect(setHideCompletedTasks).toHaveBeenCalledWith(true)
    })

    it("shows the audio settings and changes them", async () => {
        const user = await open()
        await user.click(screen.getByRole("tab", { name: "Audio" }))

        const volume = screen.getByRole("slider", { name: "Volume predefinito" })
        expect(volume).toHaveAttribute("aria-valuenow", "50")
        expect(volume).toHaveAttribute("aria-valuetext", "50%")
        fireEvent.keyDown(volume, { key: "ArrowLeft" })
        expect(audioPrefs.setAudioVolume).toHaveBeenCalledWith(0.49)

        const opacity = screen.getByRole("slider", { name: "Trasparenza del player" })
        expect(opacity).toHaveAttribute("aria-valuemin", "40")
        fireEvent.keyDown(opacity, { key: "Home" })
        expect(audioPrefs.setAudioPlayerOpacity).toHaveBeenCalledWith(0.4)

        const visible = screen.getByRole("switch", { name: "Mostra il player flottante" })
        expect(visible).toBeChecked()
        await user.click(visible)
        expect(audioPrefs.setAudioPlayerVisible).toHaveBeenCalledWith(false)

        const size = screen.getByRole("radiogroup", { name: "Dimensione del player" })
        expect(within(size).getByRole("radio", { name: "Normale" })).toBeChecked()
        await user.click(within(size).getByRole("radio", { name: "Grande" }))
        expect(audioPrefs.setAudioPlayerScale).toHaveBeenCalledWith(1.2)
        await user.click(within(size).getByRole("radio", { name: "Piccolo" }))
        expect(audioPrefs.setAudioPlayerScale).toHaveBeenCalledWith(0.85)

        await user.click(screen.getByRole("button", { name: "Ripristina tutto" }))
        expect(audioPrefs.resetAudioSettings).toHaveBeenCalled()
    })

    it("sets the sidebar item size from the segmented control and previews it", async () => {
        await open()
        const group = screen.getByRole("radiogroup", { name: "Dimensione di cartelle e note" })
        expect(within(group).getByRole("radio", { name: "Normale" })).toBeChecked()
        expect(screen.getByTestId("sidebar-size-preview").firstElementChild).toHaveClass("h-7")

        await userEvent.click(within(group).getByRole("radio", { name: "Grande" }))
        expect(setSidebarItemSize).toHaveBeenCalledWith("large")
    })

    it("keeps a value selected when the selected segment is pressed again", async () => {
        await open()
        const group = screen.getByRole("radiogroup", { name: "Dimensione di cartelle e note" })
        setSidebarItemSize.mockClear()
        await userEvent.click(within(group).getByRole("radio", { name: "Normale" }))
        expect(setSidebarItemSize).not.toHaveBeenCalled()
        expect(within(group).getByRole("radio", { name: "Normale" })).toBeChecked()
    })

    it("sets the color intensity with the slider, previews it and can reset it", async () => {
        colorPrefs.colorIntensity = 1.5
        const user = await open()
        const slider = screen.getByRole("slider", { name: "Intensità dei colori" })
        expect(slider).toHaveAttribute("aria-valuenow", "150")
        expect(slider).toHaveAttribute("aria-valuemin", "25")
        expect(slider).toHaveAttribute("aria-valuemax", "175")
        expect(slider).toHaveAttribute("aria-valuetext", "150%")
        const swatches = screen.getByTestId("color-intensity-preview").children
        expect(swatches).toHaveLength(3)
        expect((swatches[0] as HTMLElement).style.backgroundColor).toBe("rgba(239, 68, 68, 0.45)")

        fireEvent.keyDown(slider, { key: "ArrowLeft" })
        expect(setColorIntensity).toHaveBeenCalledWith(1.45)

        await user.click(screen.getByRole("button", { name: "Ripristina" }))
        expect(setColorIntensity).toHaveBeenLastCalledWith(1)
    })

    it("Informazioni is last and shows the app version", async () => {
        const user = await open()
        const items = screen.getAllByRole("tab")
        expect(items[items.length - 1]).toHaveTextContent("Informazioni")

        await user.click(screen.getByRole("tab", { name: "Informazioni" }))
        expect(await screen.findByText("9.8.7")).toBeInTheDocument()
        expect(screen.getByText("2.1.0")).toBeInTheDocument()
        expect(screen.getByText("Ivan Erricis")).toBeInTheDocument()
        expect(screen.getByText("C:\\Docs\\EasyTask\\easytask.db")).toBeInTheDocument()
    })

    it("opens on the About page when the app requests it (update toast)", async () => {
        render(<DialogSettings />)
        window.dispatchEvent(new CustomEvent("easytask:open-settings", { detail: { category: "about" } }))
        expect(await screen.findByText("9.8.7", {}, { timeout: 5000 })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Controlla aggiornamenti" })).toBeInTheDocument()
    })

    it("opens the repository link with the opener plugin", async () => {
        const user = await open()
        await user.click(screen.getByRole("tab", { name: "Informazioni" }))
        await user.click(await screen.findByRole("button", { name: "https://github.com/ivanerricis/easytask-tauri" }))
        expect(openUrl).toHaveBeenCalledWith("https://github.com/ivanerricis/easytask-tauri")
    })

    it("shows a toast when the link cannot be opened", async () => {
        vi.mocked(openUrl).mockRejectedValue(new Error("denied"))
        const user = await open()
        await user.click(screen.getByRole("tab", { name: "Informazioni" }))
        await user.click(await screen.findByRole("button", { name: "https://github.com/ivanerricis/easytask-tauri" }))
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("denied")))
    })
})
