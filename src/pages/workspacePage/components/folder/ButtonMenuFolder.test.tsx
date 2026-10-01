import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ButtonMenuFolder } from "./ButtonMenuFolder"
import { ItemMenuButton } from "@/components/item-menu"
import type { Folder } from "@/types/types"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const updateFolderColorContent = vi.fn()
const getWorkspaceData = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceData: () => ({ updateFolderColorContent, getWorkspaceData, updateItemColor: vi.fn() }),
}))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: { id: 1 } }) }))
vi.mock("../MoveToSubmenu", () => ({ MoveToSubmenu: () => null }))
vi.mock("./DialogAddNote", () => ({ DialogAddNote: () => null }))
vi.mock("./DialogAddSubFolder", () => ({ DialogAddSubFolder: () => null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))
vi.mock("@/components/dialogs/dialog-rename", () => ({
    DialogRenameItem: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Dialog rinomina</div> : null,
}))

const folder = { id: 3, name: "Cartella", folderID: null, color: "#00ff00" } as Folder

beforeEach(() => {
    vi.clearAllMocks()
    updateFolderColorContent.mockResolvedValue(undefined)
})
const ENTRIES = ["Nuova nota", "Nuova cartella", "Rinomina", "Colora contenuto", "Cambia colore", "Elimina"]

const setup = () => {
    const onRowClick = vi.fn()
    render(
        <ButtonMenuFolder folder={folder}>
            <div data-testid="row" onClick={onRowClick}>
                Cartella
                <ItemMenuButton />
            </div>
        </ButtonMenuFolder>,
    )
    return { onRowClick, row: screen.getByTestId("row") }
}

describe("ButtonMenuFolder", () => {
    it("opens the menu from the '…' button", async () => {
        const user = userEvent.setup()
        const { row } = setup()
        await user.click(row.querySelector("svg")!)
        for (const entry of ENTRIES) expect(await screen.findByText(entry)).toBeInTheDocument()
    })

    it("opens the same menu with a right click anywhere on the row, without clicking the row", async () => {
        const { onRowClick, row } = setup()
        fireEvent.contextMenu(row, { clientX: 20, clientY: 30 })
        for (const entry of ENTRIES) expect(await screen.findByText(entry)).toBeInTheDocument()
        expect(onRowClick).not.toHaveBeenCalled()
    })

    it("colors the content through the context (which updates the sidebar tree) without reloading the workspace", async () => {
        const user = userEvent.setup()
        const { row } = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Colora contenuto"))
        await waitFor(() => expect(updateFolderColorContent).toHaveBeenCalledWith(3, "#00ff00"))
        expect(getWorkspaceData).not.toHaveBeenCalled()
    })

    it("shows a toast when coloring the content fails", async () => {
        const user = userEvent.setup()
        updateFolderColorContent.mockRejectedValue(new Error("boom"))
        const { row } = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Colora contenuto"))
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
    })

    it("runs the chosen entry of the context menu and closes it", async () => {
        const user = userEvent.setup()
        const { row } = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Rinomina"))
        expect(await screen.findByText("Dialog rinomina")).toBeInTheDocument()
        expect(screen.queryByText("Elimina")).not.toBeInTheDocument()
    })
})
