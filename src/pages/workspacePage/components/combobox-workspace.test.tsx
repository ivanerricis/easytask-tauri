import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Workspace } from "@/types/types"
import { ComboboxWorkspace } from "./combobox-workspace"

const workspaces = [{ id: 1, name: "Casa" }, { id: 2, name: "Casa" }, { id: 3, name: "Lavoro" }] as unknown as Workspace[]
const setCurrentWorkspace = vi.fn()
const getWorkspaceData = vi.fn()
const reportError = vi.fn()

vi.mock("@/contexts/use-workspace", () => ({
    useWorkspace: () => ({ workspaces, currentWorkspace: workspaces[0], setCurrentWorkspace }),
}))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceData: () => ({ getWorkspaceData }) }))
vi.mock("@/lib/report-error", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/report-error")>()), reportError: (...args: unknown[]) => reportError(...args) }))
// cmdk and Radix measure and scroll: jsdom has neither
vi.stubGlobal("ResizeObserver", class { observe() { } unobserve() { } disconnect() { } })
Element.prototype.scrollIntoView = () => { }

describe("ComboboxWorkspace", () => {
    beforeEach(() => {
        setCurrentWorkspace.mockClear()
        getWorkspaceData.mockReset()
        reportError.mockClear()
    })

    it("names the combobox with its purpose and the current workspace", () => {
        render(<ComboboxWorkspace />)
        expect(screen.getByRole("combobox")).toHaveAccessibleName(/Casa/)
        expect(screen.getByRole("combobox").getAttribute("aria-label")).not.toBe("Casa")
    })

    it("selects by id: of two workspaces with the same name, the one clicked", async () => {
        getWorkspaceData.mockResolvedValue(undefined)
        render(<ComboboxWorkspace />)
        await userEvent.click(screen.getByRole("combobox"))
        const options = await screen.findAllByRole("option", { name: /Casa/ })
        expect(options).toHaveLength(2)
        await userEvent.click(options[1])
        expect(setCurrentWorkspace).toHaveBeenCalledWith(workspaces[1])
        expect(getWorkspaceData).toHaveBeenCalledWith(2)
        await waitFor(() => expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false"))
    })

    it("reports the error and closes the popover when the data cannot be loaded", async () => {
        const failure = new Error("boom")
        getWorkspaceData.mockRejectedValue(failure)
        render(<ComboboxWorkspace />)
        await userEvent.click(screen.getByRole("combobox"))
        await userEvent.click(await screen.findByRole("option", { name: "Lavoro" }))
        await waitFor(() => expect(reportError).toHaveBeenCalledWith(failure, expect.any(String)))
        await waitFor(() => expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false"))
    })
})
