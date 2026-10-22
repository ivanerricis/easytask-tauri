import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataSettings } from "./DataSettings"

const invoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const setUndoLimit = vi.fn()
const setTrashAutoEmptyDays = vi.fn()
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ undoLimit: 50, setUndoLimit, trashAutoEmptyDays: 0, setTrashAutoEmptyDays }) }))
vi.mock("./BackupSettings", () => ({ BackupSettings: () => null }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: null }) }))
vi.mock("@/hooks/use-workspace-transfer", () => ({
    useWorkspaceTransfer: () => ({ exportWorkspace: vi.fn(), importWorkspace: vi.fn(), isBusy: false }),
}))

const renderSettings = () => render(<MemoryRouter><DataSettings /></MemoryRouter>)

beforeEach(() => {
    invoke.mockReset().mockResolvedValue(false)
    setUndoLimit.mockReset()
    setTrashAutoEmptyDays.mockReset()
})

describe("DataSettings OneDrive warning", () => {
    it("is shown when the data folder is synced by OneDrive", async () => {
        invoke.mockResolvedValue(true)
        renderSettings()
        expect(await screen.findByRole("note")).toHaveTextContent("OneDrive")
        expect(invoke).toHaveBeenCalledWith("data_dir_in_onedrive")
    })

    it("is hidden otherwise", async () => {
        invoke.mockResolvedValue(false)
        renderSettings()
        await waitFor(() => expect(invoke).toHaveBeenCalledWith("data_dir_in_onedrive"))
        expect(screen.queryByRole("note")).not.toBeInTheDocument()
    })

    it("is hidden when the check fails", async () => {
        invoke.mockRejectedValue(new Error("boom"))
        renderSettings()
        await waitFor(() => expect(invoke).toHaveBeenCalledWith("data_dir_in_onedrive"))
        expect(screen.queryByRole("note")).not.toBeInTheDocument()
    })
})

describe("DataSettings history", () => {
    it("offers the limits and saves the chosen one", async () => {
        renderSettings()
        const user = userEvent.setup()
        const select = screen.getByRole("combobox", { name: "Azioni annullabili" })
        expect(select).toHaveTextContent("50")
        await user.click(select)
        expect(screen.getAllByRole("option").map(o => o.textContent)).toEqual(["25", "50", "100", "200", "500"])
        await user.click(screen.getByRole("option", { name: "200" }))
        expect(setUndoLimit).toHaveBeenCalledWith(200)
    })
})

describe("DataSettings trash", () => {
    it("offers the ages and saves the chosen one", async () => {
        renderSettings()
        const user = userEvent.setup()
        const select = screen.getByRole("combobox", { name: "Svuota automaticamente il cestino" })
        expect(select).toHaveTextContent("Mai")
        await user.click(select)
        expect(screen.getAllByRole("option").map(o => o.textContent)).toEqual(["Mai", "Dopo 7 giorni", "Dopo 30 giorni", "Dopo 90 giorni"])
        await user.click(screen.getByRole("option", { name: "Dopo 30 giorni" }))
        expect(setTrashAutoEmptyDays).toHaveBeenCalledWith(30)
    })
})
