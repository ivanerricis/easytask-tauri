import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { ItemMenuButton } from "@/components/item-menu"
import { makeNote } from "@/test/ui-fixtures"

const openNote = vi.fn()
const duplicateNote = vi.fn()
const create = vi.fn()
const archive = vi.fn()
const archiveItem = vi.fn()

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => ({ create, archive }) }))

vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ getWorkspaceData: vi.fn(), updateItemColor: vi.fn(), duplicateNote, archiveItem }),
}))
const exportItem = vi.fn()
vi.mock("@/hooks/use-workspace-transfer", () => ({ useItemTransfer: () => ({ exportItem, importItems: vi.fn(), isBusy: false }) }))
const reorderTabs = vi.fn()
let openTabs: { id: number }[] = []
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote, reorderTabs }), useTabs: () => ({ tabs: openTabs }) }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: { id: 1 } }) }))
vi.mock("../MoveToSubmenu", () => ({ MoveToSubmenu: () => null }))
vi.mock("@/components/dialogs/dialog-create-template", () => ({
    DialogCreateTemplate: ({ isOpen, note }: { isOpen: boolean, note: { id: number } }) =>
        isOpen ? <div>Dialog template {note.id}</div> : null,
}))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))
vi.mock("@/components/dialogs/dialog-rename", () => ({
    DialogRenameItem: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Dialog rinomina</div> : null,
}))

const ENTRIES = ["Apri", "Rinomina", "Duplica", "Cambia colore", "Crea template", "Esporta", "Archivia", "Elimina"]

beforeEach(() => {
    vi.clearAllMocks()
    openTabs = []
    duplicateNote.mockResolvedValue(9)
    archiveItem.mockResolvedValue(undefined)
})

const setup = () => {
    render(
        <ButtonMenuNote note={makeNote({ id: 4 })}>
            <div data-testid="row">
                Nota
                <ItemMenuButton />
            </div>
        </ButtonMenuNote>,
    )
    return screen.getByTestId("row")
}

describe("ButtonMenuNote", () => {
    it("has no tab moves for a note that is not open as a tab", async () => {
        const row = setup()
        fireEvent.contextMenu(row)
        await screen.findByText("Apri")
        expect(screen.queryByText("Sposta tab a sinistra")).not.toBeInTheDocument()
    })

    it("moves the tab of an open note left and right, disabled at the ends", async () => {
        const user = userEvent.setup()
        openTabs = [{ id: 5 }, { id: 4 }, { id: 8 }]
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Sposta tab a sinistra"))
        expect(reorderTabs).toHaveBeenCalledWith(1, 0)
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Sposta tab a destra"))
        expect(reorderTabs).toHaveBeenCalledWith(1, 2)
    })

    it("disables the move to the left of the first tab", async () => {
        openTabs = [{ id: 4 }, { id: 8 }]
        const row = setup()
        fireEvent.contextMenu(row)
        expect((await screen.findByText("Sposta tab a sinistra")).closest("[role=menuitem]")).toHaveAttribute("aria-disabled", "true")
    })

    it("shows the same entries from the '…' button and from a right click", async () => {
        const user = userEvent.setup()
        const row = setup()
        await user.click(row.querySelector("svg")!)
        for (const entry of ENTRIES) expect(await screen.findByText(entry)).toBeInTheDocument()
        await user.keyboard("{Escape}")
        expect(screen.queryByText("Elimina")).not.toBeInTheDocument()

        fireEvent.contextMenu(row)
        for (const entry of ENTRIES) expect(await screen.findByText(entry)).toBeInTheDocument()
    })

    it("opens the note and the rename dialog from the context menu", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Apri"))
        expect(openNote).toHaveBeenCalledWith(4)

        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Rinomina"))
        expect(await screen.findByText("Dialog rinomina")).toBeInTheDocument()
    })

    it("opens the create template dialog from the '…' button and from the context menu", async () => {
        const user = userEvent.setup()
        const row = setup()
        await user.click(row.querySelector("svg")!)
        await user.click(await screen.findByText("Crea template"))
        expect(await screen.findByText("Dialog template 4")).toBeInTheDocument()
    })

    it("opens the create template dialog from a right click", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Crea template"))
        expect(await screen.findByText("Dialog template 4")).toBeInTheDocument()
    })

    it("duplicates the note, records the creation, opens the copy and confirms", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Duplica"))
        await waitFor(() => expect(openNote).toHaveBeenCalledWith(9))
        expect(duplicateNote).toHaveBeenCalledWith(4)
        expect(create).toHaveBeenCalledWith("note", 9, null)
        expect(toast.success).toHaveBeenCalledWith("Nota duplicata")
    })

    it("shows the error and opens nothing when the duplication fails", async () => {
        const user = userEvent.setup()
        duplicateNote.mockRejectedValueOnce(new Error("boom"))
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Duplica"))
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
        expect(openNote).not.toHaveBeenCalled()
        expect(create).not.toHaveBeenCalled()
    })

    it("does not open the menu on a right click inside a text field", () => {
        render(
            <ButtonMenuNote note={makeNote()}>
                <div><input aria-label="nome" /></div>
            </ButtonMenuNote>,
        )
        fireEvent.contextMenu(screen.getByLabelText("nome"))
        expect(screen.queryByText("Rinomina")).not.toBeInTheDocument()
    })

    it("archives the note without asking and records the undo step", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Archivia"))
        await waitFor(() => expect(archive).toHaveBeenCalledWith("note", 4, expect.any(String)))
        expect(archiveItem).toHaveBeenCalledWith("note", 4)
        expect(screen.queryByText("Archivia")).not.toBeInTheDocument()
    })

    it("shows the error and records nothing when the archive fails", async () => {
        const user = userEvent.setup()
        archiveItem.mockRejectedValueOnce(new Error("boom"))
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Archivia"))
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
        expect(archive).not.toHaveBeenCalled()
    })

    it("exports the note from the context menu", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Esporta"))
        expect(exportItem).toHaveBeenCalledWith("note", expect.objectContaining({ id: 4 }))
        expect(screen.queryByText("Elimina")).not.toBeInTheDocument()
    })
})
