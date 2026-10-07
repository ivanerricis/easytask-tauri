import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ButtonMenuGroup } from "./ButtonMenuGroup"
import { makeGroup } from "@/test/ui-fixtures"

const patchGroup = vi.fn()
const removeGroup = vi.fn()
vi.mock("../NoteStepMoves", () => ({ GroupStepMoves: () => null }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ patchGroup, removeGroup }) }))
vi.mock("@/contexts/use-audio", () => ({ useAudio: () => ({ addFiles: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const updateItemColor = vi.fn()
const recordColor = vi.fn()
const archive = vi.fn()
const archiveItem = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ updateItemColor, archiveItem }) }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => ({ color: recordColor, archive }) }))
vi.mock("@/components/dialogs/dialog-delete", () => ({
    DialogDeleteItem: ({ isOpen, optimistic }: { isOpen: boolean, optimistic: () => () => void }) =>
        isOpen ? <button onClick={() => optimistic()}>Dialog elimina</button> : null,
}))
vi.mock("@/components/dialogs/dialog-rename", () => ({
    DialogRenameItem: ({ isOpen, optimistic }: { isOpen: boolean, optimistic: (name: string) => () => void }) =>
        isOpen ? (
            <>
                <button onClick={() => optimistic("Nuovo")}>Dialog rinomina</button>
                <button onClick={() => optimistic("")}>Svuota nome</button>
            </>
        ) : null,
}))

beforeEach(() => {
    vi.clearAllMocks()
    updateItemColor.mockResolvedValue(undefined)
    patchGroup.mockReturnValue(vi.fn())
    removeGroup.mockReturnValue(vi.fn())
    archiveItem.mockResolvedValue(undefined)
})

const setup = (color?: string | null) => {
    render(
        <ButtonMenuGroup group={makeGroup({ id: 3, color })}>
            <div data-testid="row">Gruppo</div>
        </ButtonMenuGroup>,
    )
    return screen.getByTestId("row")
}

describe("ButtonMenuGroup", () => {
    it("archives the group, removing it from the note, and records the undo step", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Archivia"))
        await waitFor(() => expect(archive).toHaveBeenCalledWith("section_group", 3, undefined))
        expect(removeGroup).toHaveBeenCalledWith(3)
        expect(archiveItem).toHaveBeenCalledWith("section_group", 3)
    })

    it("renames through the cached note tree, clearing the name when it is empty", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Rinomina"))
        await user.click(await screen.findByText("Dialog rinomina"))
        expect(patchGroup).toHaveBeenCalledWith(3, { name: "Nuovo" })
        await user.click(await screen.findByText("Svuota nome"))
        expect(patchGroup).toHaveBeenCalledWith(3, { name: null })
    })

    it("removes the group through the cached note tree", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Elimina"))
        await user.click(await screen.findByText("Dialog elimina"))
        expect(removeGroup).toHaveBeenCalledWith(3)
    })

    const openColorMenu = async (user: ReturnType<typeof userEvent.setup>, row: HTMLElement) => {
        fireEvent.contextMenu(row)
        const trigger = (await screen.findByText("Cambia colore")).closest("[data-slot=context-menu-sub-trigger]") as HTMLElement
        trigger.focus()
        await user.keyboard("{ArrowRight}")
    }

    it("applies a color at once, writes it and records it for undo", async () => {
        const user = userEvent.setup()
        const row = setup()
        await openColorMenu(user, row)
        await user.click(await screen.findByLabelText("Colore #e6194b"))

        expect(patchGroup).toHaveBeenCalledWith(3, { color: "#e6194b" })
        expect(updateItemColor).toHaveBeenCalledWith("section_group", 3, "#e6194b")
        await waitFor(() => expect(recordColor).toHaveBeenCalledWith("section_group", 3, undefined, null, "#e6194b"))
    })

    it("removes the color of a colored group", async () => {
        const user = userEvent.setup()
        const row = setup("#e6194b")
        await openColorMenu(user, row)
        await user.click(await screen.findByText("Elimina", { selector: "button[type=button]" }))

        expect(patchGroup).toHaveBeenCalledWith(3, { color: null })
        expect(updateItemColor).toHaveBeenCalledWith("section_group", 3, undefined)
        await waitFor(() => expect(recordColor).toHaveBeenCalledWith("section_group", 3, undefined, "#e6194b", null))
    })

    it("restores the color and shows the error when the write fails, without recording it", async () => {
        const user = userEvent.setup()
        const rollback = vi.fn()
        patchGroup.mockReturnValue(rollback)
        updateItemColor.mockRejectedValueOnce(new Error("boom"))
        const row = setup()
        await openColorMenu(user, row)
        await user.click(await screen.findByLabelText("Colore #e6194b"))

        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalledWith("boom")
        expect(recordColor).not.toHaveBeenCalled()
    })
})
