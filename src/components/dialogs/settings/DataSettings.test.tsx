import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataSettings } from "./DataSettings"

const invoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("./BackupSettings", () => ({ BackupSettings: () => null }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: null }) }))
vi.mock("@/hooks/use-workspace-transfer", () => ({
    useWorkspaceTransfer: () => ({ exportWorkspace: vi.fn(), importWorkspace: vi.fn(), isBusy: false }),
}))

const renderSettings = () => render(<MemoryRouter><DataSettings /></MemoryRouter>)

beforeEach(() => {
    invoke.mockReset()
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
