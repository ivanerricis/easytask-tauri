import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { UpdateSection } from "./UpdateSection"

const check = vi.fn()
const relaunch = vi.fn()
const openUrl = vi.fn()
const isPortable = vi.fn()

vi.mock("@tauri-apps/plugin-updater", () => ({ check: () => check() }))
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => relaunch() }))
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: (...a: unknown[]) => openUrl(...a) }))
vi.mock("@/db/appPaths", () => ({ isPortable: () => isPortable() }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))

const fakeUpdate = (downloadAndInstall = vi.fn().mockResolvedValue(undefined)) => ({
    version: "1.2.3",
    body: "Nuove cose",
    downloadAndInstall,
})

beforeEach(() => {
    check.mockReset()
    relaunch.mockReset().mockResolvedValue(undefined)
    openUrl.mockReset().mockResolvedValue(undefined)
    isPortable.mockReset().mockResolvedValue(false)
})

describe("UpdateSection", () => {
    it("says the app is up to date", async () => {
        check.mockResolvedValue(null)
        render(<UpdateSection />)
        await userEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }))
        expect(await screen.findByText("EasyTask è aggiornato.")).toBeInTheDocument()
    })

    it("shows a handled error when the check fails", async () => {
        check.mockRejectedValue(new Error("offline"))
        render(<UpdateSection />)
        await userEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }))
        expect(await screen.findByText(/Impossibile controllare gli aggiornamenti - offline/)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Controlla aggiornamenti" })).toBeEnabled()
    })

    it("downloads, installs and relaunches when installed", async () => {
        const install = vi.fn(async (onEvent: (e: unknown) => void) => {
            onEvent({ event: "Started", data: { contentLength: 100 } })
            onEvent({ event: "Progress", data: { chunkLength: 50 } })
        })
        check.mockResolvedValue(fakeUpdate(install))
        render(<UpdateSection />)
        await userEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }))
        expect(await screen.findByText("Disponibile la versione 1.2.3.")).toBeInTheDocument()
        expect(screen.getByText("Nuove cose")).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: "Scarica e installa" }))
        await waitFor(() => expect(relaunch).toHaveBeenCalledTimes(1))
        expect(install).toHaveBeenCalledTimes(1)
    })

    it("shows the notes of the update in the language of the app", async () => {
        check.mockResolvedValue({ ...fakeUpdate(), body: "## English\n\n- Duplicate notes.\n\n## Italiano\n\n- Duplica le note.\n" })
        render(<UpdateSection />)
        await userEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }))
        expect(await screen.findByText("Duplica le note.")).toBeInTheDocument()
        expect(screen.queryByText("Duplicate notes.")).not.toBeInTheDocument()
    })

    it("reports an install failure and keeps the update available", async () => {
        check.mockResolvedValue(fakeUpdate(vi.fn().mockRejectedValue(new Error("boom"))))
        render(<UpdateSection />)
        await userEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }))
        await userEvent.click(await screen.findByRole("button", { name: "Scarica e installa" }))
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("boom")))
        expect(relaunch).not.toHaveBeenCalled()
        expect(screen.getByRole("button", { name: "Scarica e installa" })).toBeInTheDocument()
    })

    it("in portable mode never installs and opens the Releases page", async () => {
        isPortable.mockResolvedValue(true)
        const update = fakeUpdate()
        check.mockResolvedValue(update)
        render(<UpdateSection />)
        await userEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }))
        await userEvent.click(await screen.findByRole("button", { name: "Apri la pagina Release" }))
        expect(openUrl).toHaveBeenCalledWith("https://github.com/ivanerricis/easytask-tauri/releases")
        expect(screen.queryByRole("button", { name: "Scarica e installa" })).not.toBeInTheDocument()
        expect(update.downloadAndInstall).not.toHaveBeenCalled()
    })

    it("saves the startup check preference", async () => {
        const { getCheckUpdatesOnStartup } = await import("@/lib/store/preferences")
        render(<UpdateSection />)
        const toggle = screen.getByRole("switch", { name: "Controlla all'avvio" })
        await waitFor(() => expect(toggle).toBeChecked())
        await userEvent.click(toggle)
        await waitFor(async () => expect(await getCheckUpdatesOnStartup()).toBe(false))
    })
})
