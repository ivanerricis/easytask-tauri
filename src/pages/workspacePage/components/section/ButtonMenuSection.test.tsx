import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ButtonMenuSection } from "./ButtonMenuSection"
import { ItemMenuButton } from "@/components/item-menu"
import { makeSection } from "@/test/ui-fixtures"

vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceActions: () => ({ updateItemColor: vi.fn() }) }))
vi.mock("@/contexts/tabs-context", () => ({ useActiveNoteId: () => null }))
vi.mock("@/contexts/active-note-context", () => ({ useActiveNoteActions: () => ({ getNoteData: vi.fn() }) }))
vi.mock("../NoteMoveSubmenus", () => ({ SectionMoveSubmenu: () => null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))
vi.mock("@/components/dialogs/dialog-rename", () => ({
    DialogRenameItem: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Dialog rinomina</div> : null,
}))

const ENTRIES = ["Rinomina", "Cambia colore", "Elimina"]

const setup = () => {
    render(
        <ButtonMenuSection section={makeSection()}>
            <div data-testid="row">
                Sezione
                <ItemMenuButton />
            </div>
        </ButtonMenuSection>,
    )
    return screen.getByTestId("row")
}

describe("ButtonMenuSection", () => {
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

    it("opens the rename dialog from the context menu", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Rinomina"))
        expect(await screen.findByText("Dialog rinomina")).toBeInTheDocument()
    })

    it("opens the color submenu from the context menu", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        const trigger = (await screen.findByText("Cambia colore")).closest("[data-slot=context-menu-sub-trigger]") as HTMLElement
        trigger.focus()
        await user.keyboard("{ArrowRight}")
        expect(await screen.findByText("Elimina", { selector: "button.flex.items-center.p-1" })).toBeInTheDocument()
    })
})
