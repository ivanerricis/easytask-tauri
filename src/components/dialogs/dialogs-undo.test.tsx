import type { ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { UndoContext } from "@/contexts/undo/context"
import { DialogAddColor } from "./dialog-add-color"
import { DialogDeleteItem } from "./dialog-delete"
import { DialogRenameItem } from "./dialog-rename"

// The dialogs record the successful actions in the undo history
const deleteItem = vi.fn()
const renameItem = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceData: () => ({ deleteItem, renameItem }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const recorder = { rename: vi.fn(), color: vi.fn(), remove: vi.fn() }
const withUndo = (ui: ReactNode) => (
    <UndoContext.Provider value={{
        canUndo: false, canRedo: false, undoLabel: null, redoLabel: null,
        entries: { undo: [], redo: [] }, undoTo: vi.fn(), redoTo: vi.fn(),
        undo: vi.fn(), redo: vi.fn(), recorder: recorder as never,
    }}>
        {ui}
    </UndoContext.Provider>
)

beforeEach(() => {
    vi.resetAllMocks()
    deleteItem.mockResolvedValue(undefined)
    renameItem.mockResolvedValue(undefined)
})

describe("DialogDeleteItem and undo", () => {
    it("records the delete after it succeeded", async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        render(withUndo(<DialogDeleteItem item={{ id: 3, name: "Spesa" }} itemType="note" isOpen onOpenChange={onOpenChange} />))
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(recorder.remove).toHaveBeenCalledWith("note", 3, "Spesa")
    })

    it("records nothing when the delete fails", async () => {
        const user = userEvent.setup()
        deleteItem.mockRejectedValue(new Error("constraint"))
        render(withUndo(<DialogDeleteItem item={{ id: 3 }} itemType="task" isOpen onOpenChange={vi.fn()} />))
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(deleteItem).toHaveBeenCalled())
        expect(recorder.remove).not.toHaveBeenCalled()
    })

    it("does not record the types that cannot be undone (audio files, workspaces)", async () => {
        const user = userEvent.setup()
        render(withUndo(<DialogDeleteItem item={{ id: 3 }} itemType="audio_file" isOpen onOpenChange={vi.fn()} />))
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(deleteItem).toHaveBeenCalledWith("audio_file", 3))
        expect(recorder.remove).not.toHaveBeenCalled()
    })
})

describe("DialogRenameItem and undo", () => {
    it("records the old and the new name after the rename", async () => {
        const user = userEvent.setup()
        render(withUndo(<DialogRenameItem item={{ id: 5, name: "Old" }} itemType="section" isOpen onOpenChange={vi.fn()} />))
        const input = screen.getByRole("textbox")
        await user.clear(input)
        await user.type(input, "  Fresh ")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        await waitFor(() => expect(recorder.rename).toHaveBeenCalledWith("section", 5, "Old", "Fresh"))
    })

    it("records nothing when the name did not change or the rename fails", async () => {
        const user = userEvent.setup()
        const { unmount } = render(withUndo(<DialogRenameItem item={{ id: 5, name: "Old" }} itemType="task" isOpen onOpenChange={vi.fn()} />))
        await user.click(screen.getByRole("button", { name: "Salva" }))
        await waitFor(() => expect(screen.getByRole("textbox")).toBeInTheDocument())
        expect(renameItem).not.toHaveBeenCalled()
        unmount()

        renameItem.mockRejectedValue(new Error("UNIQUE"))
        render(withUndo(<DialogRenameItem item={{ id: 5, name: "Old" }} itemType="task" isOpen onOpenChange={vi.fn()} />))
        await user.type(screen.getByRole("textbox"), "x")
        await user.click(screen.getByRole("button", { name: "Salva" }))
        await waitFor(() => expect(renameItem).toHaveBeenCalled())
        expect(recorder.rename).not.toHaveBeenCalled()
    })
})

describe("DialogAddColor and undo", () => {
    it("records the previous and the new color", async () => {
        const user = userEvent.setup()
        const addColorItem = vi.fn().mockResolvedValue(undefined)
        render(withUndo(<DialogAddColor item={{ id: 4, color: "#111111", title: "Sec" } as never} itemType="section" addColorItem={addColorItem} />))
        await user.click(screen.getAllByRole("button")[0])

        await waitFor(() => expect(recorder.color).toHaveBeenCalledWith("section", 4, "Sec", "#111111", "#e6194b"))
    })

    it("records the removal of a color as null", async () => {
        const user = userEvent.setup()
        const addColorItem = vi.fn().mockResolvedValue(undefined)
        render(withUndo(<DialogAddColor item={{ id: 4, color: "#111111", name: "F" } as never} itemType="folder" addColorItem={addColorItem} />))
        await user.click(screen.getByRole("button", { name: "Elimina" }))

        await waitFor(() => expect(recorder.color).toHaveBeenCalledWith("folder", 4, "F", "#111111", null))
    })

    it("records nothing when the color is not saved", async () => {
        const user = userEvent.setup()
        const addColorItem = vi.fn().mockRejectedValue(new Error("fail"))
        render(withUndo(<DialogAddColor item={{ id: 4, color: "#111111" }} itemType="task" addColorItem={addColorItem} />))
        await user.click(screen.getAllByRole("button")[0])

        await waitFor(() => expect(addColorItem).toHaveBeenCalled())
        expect(recorder.color).not.toHaveBeenCalled()
    })
})
