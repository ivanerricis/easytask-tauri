import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataSettings } from "./DataSettings"

const invoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const setUndoLimit = vi.fn()
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ undoLimit: 50, setUndoLimit }) }))
vi.mock("./BackupSettings", () => ({ BackupSettings: () => null }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: null }) }))
vi.mock("@/hooks/use-workspace-transfer", () => ({
    useWorkspaceTransfer: () => ({ exportWorkspace: vi.fn(), importWorkspace: vi.fn(), isBusy: false }),
}))

const renderSettings = () => render(<MemoryRouter><DataSettings /></MemoryRouter>)

beforeEach(() => {
    invoke.mockReset().mockResolvedValue(false)
    setUndoLimit.mockReset()
})

describe("DataSettings OneDrive warning", () => {
    it("is shown when the data folder is synced by OneDrive", async () => {
        invoke.mockResolvedValue(true)
        renderSettings()
        expect(await screen.findByRole("alert")).toHaveTextContent("OneDrive")
        expect(invoke).toHaveBeenCalledWith("data_dir_in_onedrive")
    })

    it("is hidden otherwise", async () => {
        invoke.mockResolvedValue(false)
        renderSettings()
        await waitFor(() => expect(invoke).toHaveBeenCalledWith("data_dir_in_onedrive"))
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("is hidden when the check fails", async () => {
        invoke.mockRejectedValue(new Error("boom"))
        renderSettings()
        await waitFor(() => expect(invoke).toHaveBeenCalledWith("data_dir_in_onedrive"))
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
})

describe("DataSettings history", () => {
    it("offers the limits and saves the chosen one", async () => {
        renderSettings()
        const select = screen.getByRole("combobox", { name: "Azioni annullabili" })
        expect(select).toHaveValue("50")
        expect(Array.from((select as HTMLSelectElement).options).map(o => o.value)).toEqual(["25", "50", "100", "200", "500"])
        await userEvent.selectOptions(select, "200")
        expect(setUndoLimit).toHaveBeenCalledWith(200)
    })
})
