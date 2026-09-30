import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { ItemMenuButton } from "@/components/item-menu"
import { makeNote } from "@/test/ui-fixtures"

const openNote = vi.fn()

vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ getWorkspaceData: vi.fn(), updateItemColor: vi.fn() }),
}))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote }) }))
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

const ENTRIES = ["Apri", "Rinomina", "Cambia colore", "Crea template", "Elimina"]

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

    it("does not open the menu on a right click inside a text field", () => {
        render(
            <ButtonMenuNote note={makeNote()}>
                <div><input aria-label="nome" /></div>
            </ButtonMenuNote>,
        )
        fireEvent.contextMenu(screen.getByLabelText("nome"))
        expect(screen.queryByText("Rinomina")).not.toBeInTheDocument()
    })
})
