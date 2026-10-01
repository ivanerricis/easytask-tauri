import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ButtonMenuSection } from "./ButtonMenuSection"
import { ItemMenuButton } from "@/components/item-menu"
import { makeSection } from "@/test/ui-fixtures"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const duplicateSection = vi.fn()
const refreshActiveNote = vi.fn()
const create = vi.fn()
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => ({ create }) }))
const updateItemColor = vi.fn()
const patchSection = vi.fn()
const removeSection = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ updateItemColor, duplicateSection }) }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ patchSection, removeSection, refreshActiveNote }) }))
vi.mock("../NoteMoveSubmenus", () => ({ SectionMoveSubmenu: () => null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({
    DialogDeleteItem: ({ isOpen, optimistic }: { isOpen: boolean, optimistic: () => () => void }) =>
        isOpen ? <button onClick={() => optimistic()}>Dialog elimina</button> : null,
}))
vi.mock("@/components/dialogs/dialog-rename", () => ({
    DialogRenameItem: ({ isOpen, optimistic }: { isOpen: boolean, optimistic: (name: string) => () => void }) =>
        isOpen ? <button onClick={() => optimistic("Nuovo")}>Dialog rinomina</button> : null,
}))

const ENTRIES = ["Rinomina", "Duplica", "Cambia colore", "Elimina"]

beforeEach(() => {
    vi.clearAllMocks()
    updateItemColor.mockResolvedValue(undefined)
    patchSection.mockReturnValue(vi.fn())
    duplicateSection.mockResolvedValue(12)
    refreshActiveNote.mockResolvedValue(undefined)
})

const setup = () => {
    render(
        <ButtonMenuSection section={makeSection({ id: 7 })}>
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

    it("duplicates the section, records the creation, reloads the note and confirms", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Duplica"))
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Sezione duplicata"))
        expect(duplicateSection).toHaveBeenCalledWith(7)
        expect(create).toHaveBeenCalledWith("section", 12, null)
        expect(refreshActiveNote).toHaveBeenCalledTimes(1)
    })

    it("shows the error when the duplication fails", async () => {
        const user = userEvent.setup()
        duplicateSection.mockRejectedValueOnce(new Error("boom"))
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Duplica"))
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
        expect(create).not.toHaveBeenCalled()
        expect(refreshActiveNote).not.toHaveBeenCalled()
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

    it("renames and deletes through the cached note tree, without reloading it", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Rinomina"))
        await user.click(await screen.findByText("Dialog rinomina"))
        expect(patchSection).toHaveBeenCalledWith(7, { title: "Nuovo" })

        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Elimina"))
        await user.click(await screen.findByText("Dialog elimina"))
        expect(removeSection).toHaveBeenCalledWith(7)
    })

    it("changes the color at once and restores it when the write fails", async () => {
        const user = userEvent.setup()
        const rollback = vi.fn()
        patchSection.mockReturnValue(rollback)
        updateItemColor.mockRejectedValueOnce(new Error("boom"))
        const row = setup()
        fireEvent.contextMenu(row)
        const trigger = (await screen.findByText("Cambia colore")).closest("[data-slot=context-menu-sub-trigger]") as HTMLElement
        trigger.focus()
        await user.keyboard("{ArrowRight}")
        await user.click(await screen.findByLabelText("Colore #e6194b"))

        expect(patchSection).toHaveBeenCalledWith(7, { color: "#e6194b" })
        expect(updateItemColor).toHaveBeenCalledWith("section", 7, "#e6194b")
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalledWith("boom")
    })
})
