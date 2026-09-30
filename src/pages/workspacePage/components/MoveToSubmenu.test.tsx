import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoveToSubmenu } from "./MoveToSubmenu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const moveTreeItem = vi.fn().mockResolvedValue(undefined)
const getWorkspaceData = vi.fn().mockResolvedValue(undefined)

vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: { id: 7 } }) }))
vi.mock("@/contexts/workspace-data", () => {
    const workspaceDataTree = {
        rootFolders: [
            { id: 1, name: "Docs", folderID: null, subfolders: [{ id: 2, name: "Sub", folderID: 1, subfolders: [], notes: [] }], notes: [] },
        ],
        rootNotes: [],
    }
    return {
        useWorkspaceData: () => ({ moveTreeItem, getWorkspaceData, workspaceDataTree }),
    }
})

describe("MoveToSubmenu", () => {
    it("moves the item to the end of the chosen destination and reloads", async () => {
        const user = userEvent.setup()
        render(
            <DropdownMenu>
                <DropdownMenuTrigger>menu</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <MoveToSubmenu itemType="note" itemId={5} folderID={null} />
                </DropdownMenuContent>
            </DropdownMenu>,
        )
        await user.click(screen.getByText("menu"))
        const trigger = await screen.findByText("Sposta in…")
        const subTrigger = trigger.closest("[data-slot=dropdown-menu-sub-trigger]") as HTMLElement
        subTrigger.focus()
        await user.keyboard("{ArrowRight}")
        await user.click(await screen.findByText("Sub"))

        await waitFor(() => expect(moveTreeItem).toHaveBeenCalledWith("note", 5, 2, expect.any(Number)))
        expect(moveTreeItem.mock.calls[0][3]).toBeGreaterThan(1000)
        await waitFor(() => expect(getWorkspaceData).toHaveBeenCalledWith(7))
    })
})
