import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ItemMenuButton } from "@/components/item-menu"
import { DraftTabMenu } from "./DraftTabMenu"
import { LayoutActionsContext, LayoutContext, type LayoutActionsType } from "@/contexts/layout-context-object"

const closeNote = vi.fn()
const refreshDrafts = vi.fn().mockResolvedValue(undefined)
const flushTemplate = vi.fn().mockResolvedValue(true)
const setColor = vi.fn().mockResolvedValue(undefined)

vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ closeNote }) }))
vi.mock("@/contexts/use-template-drafts", () => ({ useTemplateDraftActions: () => ({ flushTemplate, refreshDrafts }) }))
vi.mock("@/db/queries/template-draft", () => ({ setDBTemplateDraftColor: (...args: unknown[]) => setColor(...args) }))
vi.mock("@/db/queries/template", () => ({ getDBTemplate: vi.fn().mockResolvedValue({ id: 3, name: "Sprint" }) }))
vi.mock("@/components/dialogs/dialog-rename", () => ({ DialogRenameItem: ({ itemType }: { itemType: string }) => <div>Dialog rename {itemType}</div> }))
vi.mock("@/components/dialogs/dialog-note-from-template", () => ({ DialogNoteFromTemplate: ({ template }: { template: { id: number } }) => <div>Dialog note {template.id}</div> }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => ({}) }))

const draft = { noteId: 7, templateId: 3, templateName: "Sprint", color: null, trashed: false }

beforeEach(() => vi.clearAllMocks())

const open = async () => {
    render(<DraftTabMenu draft={draft}><div data-testid="tab">Sprint<ItemMenuButton /></div></DraftTabMenu>)
    fireEvent.contextMenu(screen.getByTestId("tab"))
    await screen.findByText("Rinomina template")
}

describe("DraftTabMenu", () => {
    it("has the template entries and no delete, archive, move or duplicate", async () => {
        await open()
        for (const name of ["Rinomina template", "Cambia colore", "Crea nota da questo template", "Chiudi editor"]) {
            expect(screen.getByText(name)).toBeInTheDocument()
        }
        for (const name of ["Elimina", "Archivia", "Duplica", "Sposta in"]) {
            expect(screen.queryByText(name)).not.toBeInTheDocument()
        }
    })

    it("changes the color of the draft and reads the drafts again", async () => {
        await open()
        await userEvent.click(screen.getByText("Cambia colore"))
        await userEvent.click(await screen.findByRole("button", { name: "Nessun colore" }))
        await waitFor(() => expect(setColor).toHaveBeenCalledWith(7, null))
        await waitFor(() => expect(refreshDrafts).toHaveBeenCalled())
    })

    it("closes the editor", async () => {
        await open()
        await userEvent.click(screen.getByText("Chiudi editor"))
        expect(closeNote).toHaveBeenCalledWith(7)
    })

    it("saves the template before creating a note from it", async () => {
        await open()
        await userEvent.click(screen.getByText("Crea nota da questo template"))
        expect(await screen.findByText("Dialog note 3")).toBeInTheDocument()
        expect(flushTemplate).toHaveBeenCalledWith(3)
    })

    it("renames the template as a note_template", async () => {
        await open()
        await userEvent.click(screen.getByText("Rinomina template"))
        expect(await screen.findByText("Dialog rename note_template")).toBeInTheDocument()
    })
})

describe("DraftTabMenu open in the other pane", () => {
    const actions: LayoutActionsType = { split: vi.fn(), unsplit: vi.fn(), toggleSplit: vi.fn(), focusPane: vi.fn(), openInPane: vi.fn(), moveToPane: vi.fn() }
    const renderIn = (right: number[] | null) => {
        render(
            <LayoutContext.Provider value={{ left: { openIds: right ? [] : [7], activeId: null }, right: right && { openIds: right, activeId: null }, focused: 0, isSplit: right !== null }}>
                <LayoutActionsContext.Provider value={actions}>
                    <DraftTabMenu draft={draft}><div data-testid="tab">Sprint<ItemMenuButton /></div></DraftTabMenu>
                </LayoutActionsContext.Provider>
            </LayoutContext.Provider>,
        )
        fireEvent.contextMenu(screen.getByTestId("tab"))
    }

    it("opens the draft on the right", async () => {
        renderIn(null)
        await userEvent.click(await screen.findByText("Apri a destra"))
        expect(actions.openInPane).toHaveBeenCalledWith(7, 1)
    })

    it("moves a draft of the right pane to the left", async () => {
        renderIn([7])
        await userEvent.click(await screen.findByText("Apri a sinistra"))
        expect(actions.moveToPane).toHaveBeenCalledWith(7, 0)
        expect(screen.queryByText("Apri a destra")).not.toBeInTheDocument()
    })
})

