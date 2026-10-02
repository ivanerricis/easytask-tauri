import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { ItemMenuButton } from "@/components/item-menu"
import { makeTask } from "@/test/ui-fixtures"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const updateTaskPriority = vi.fn()
const updateTaskDescription = vi.fn()
const updateItemColor = vi.fn()
const patchTask = vi.fn()
const removeTask = vi.fn()
const rollback = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ updateTaskPriority, updateTaskDescription, updateItemColor }),
}))
const selectTask = vi.fn()
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteId: () => 9, useSelectTask: () => selectTask }))
const showTaskDetails = vi.fn()
let panelAvailable = true
vi.mock("../rightbar/use-right-panel", () => ({ useShowTaskDetails: () => (panelAvailable ? showTaskDetails : undefined) }))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNoteActions: () => ({ patchTask, removeTask }),
}))
vi.mock("../NoteMoveSubmenus", () => ({ TaskMoveSubmenu: () => null }))
vi.mock("../NoteStepMoves", () => ({ TaskStepMoves: () => null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({
    DialogDeleteItem: ({ getItemData }: { getItemData: (id: number) => Promise<void> }) => (
        <button onClick={() => { void getItemData(9) }}>dialog delete done</button>
    ),
}))
vi.mock("@/components/dialogs/dialog-add-color", () => ({
    DialogAddColor: ({ addColorItem }: { addColorItem: (type: string, id: number, color?: string) => Promise<void> }) => (
        <button onClick={() => { addColorItem("task", 5, "#ff0000").catch(() => { }) }}>pick color</button>
    ),
}))
vi.mock("./DialogTaskDescription", () => ({ DialogTaskDescription: () => null }))

beforeEach(() => {
    vi.clearAllMocks()
    panelAvailable = true
    updateTaskPriority.mockResolvedValue(undefined)
    updateTaskDescription.mockResolvedValue(undefined)
    updateItemColor.mockResolvedValue(undefined)
    patchTask.mockReturnValue(rollback)
})

describe("ButtonMenuTask optimistic updates", () => {
    const openMenu = async (task = makeTask({ id: 5 })) => {
        render(<ButtonMenuTask task={task}><div data-testid="row">Task</div></ButtonMenuTask>)
        fireEvent.contextMenu(screen.getByTestId("row"))
    }

    // The color palette lives in a submenu: open it with the keyboard like the user would
    const pickColor = async (user: ReturnType<typeof userEvent.setup>) => {
        const trigger = (await screen.findByRole("button", { name: "Cambia colore" })).closest("[role=menuitem]") as HTMLElement
        trigger.focus()
        await user.keyboard("{ArrowRight}")
        await user.click(await screen.findByText("pick color"))
    }

    it("'Mostra dettagli' selects the task and opens the details panel", async () => {
        const user = userEvent.setup()
        await openMenu(makeTask({ id: 5 }))
        await user.click(await screen.findByRole("button", { name: "Mostra dettagli" }))
        expect(showTaskDetails).toHaveBeenCalledWith(5)
        expect(selectTask).not.toHaveBeenCalled()
    })

    it("'Mostra dettagli' only selects the task where there is no panel", async () => {
        const user = userEvent.setup()
        panelAvailable = false
        await openMenu(makeTask({ id: 5 }))
        await user.click(await screen.findByRole("button", { name: "Mostra dettagli" }))
        expect(selectTask).toHaveBeenCalledWith(5)
    })

    it("toggles the priority optimistically and keeps it on success", async () => {
        const user = userEvent.setup()
        await openMenu(makeTask({ id: 5, priority: false }))
        await user.click(await screen.findByRole("button", { name: "Aggiungi priorità" }))
        await waitFor(() => expect(updateTaskPriority).toHaveBeenCalledWith(5, true))
        expect(patchTask).toHaveBeenCalledWith(5, { priority: true })
        expect(rollback).not.toHaveBeenCalled()
    })

    it("rolls the priority back with a toast when the write fails", async () => {
        const user = userEvent.setup()
        updateTaskPriority.mockRejectedValue(new Error("boom"))
        await openMenu(makeTask({ id: 5, priority: false }))
        await user.click(await screen.findByRole("button", { name: "Aggiungi priorità" }))
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalled()
    })

    it("removes the description optimistically, without reloading", async () => {
        const user = userEvent.setup()
        await openMenu(makeTask({ id: 5, description: "note" }))
        await user.click(await screen.findByRole("button", { name: "Rimuovi descrizione" }))
        await waitFor(() => expect(updateTaskDescription).toHaveBeenCalledWith(5, undefined))
        expect(patchTask).toHaveBeenCalledWith(5, { description: "" })
        expect(rollback).not.toHaveBeenCalled()
    })

    it("restores the description when removing it fails", async () => {
        const user = userEvent.setup()
        updateTaskDescription.mockRejectedValue(new Error("boom"))
        await openMenu(makeTask({ id: 5, description: "note" }))
        await user.click(await screen.findByRole("button", { name: "Rimuovi descrizione" }))
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalledWith("boom")
    })

    it("applies a picked color to the cached task and restores it when the write fails", async () => {
        const user = userEvent.setup()
        await openMenu()
        await pickColor(user)
        await waitFor(() => expect(updateItemColor).toHaveBeenCalledWith("task", 5, "#ff0000"))
        expect(patchTask).toHaveBeenCalledWith(5, { color: "#ff0000" })
        expect(rollback).not.toHaveBeenCalled()
    })

    it("restores the previous color when the color write fails", async () => {
        const user = userEvent.setup()
        updateItemColor.mockRejectedValue(new Error("boom"))
        await openMenu()
        await pickColor(user)
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
    })

    it("removes the task from the cached note once the delete dialog succeeded", async () => {
        await openMenu()
        fireEvent.click(await screen.findByText("dialog delete done"))
        expect(removeTask).toHaveBeenCalledWith(5)
    })
})

describe("ButtonMenuTask", () => {
    it("opens the subtask input from the 'Aggiungi sottotask' entry and closes the menu", async () => {
        const user = userEvent.setup()
        const onAddSubtask = vi.fn()
        const { container } = render(
            <ButtonMenuTask task={makeTask({ id: 5 })} onAddSubtask={onAddSubtask}>
                <div><ItemMenuButton /></div>
            </ButtonMenuTask>,
        )

        await user.click(container.querySelector("svg")!)
        await user.click(await screen.findByRole("button", { name: "Aggiungi sottotask" }))

        expect(onAddSubtask).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole("button", { name: "Aggiungi sottotask" })).not.toBeInTheDocument()
    })

    it("opens the same entries with a right click on the row, and 'Aggiungi sottotask' still opens the input", async () => {
        const user = userEvent.setup()
        const onAddSubtask = vi.fn()
        render(
            <ButtonMenuTask task={makeTask({ id: 5 })} onAddSubtask={onAddSubtask}>
                <div data-testid="row">Task</div>
            </ButtonMenuTask>,
        )

        fireEvent.contextMenu(screen.getByTestId("row"))
        for (const entry of ["Aggiungi sottotask", "Aggiungi descrizione", "Aggiungi priorità", "Cambia colore", "Elimina"])
            expect(await screen.findByRole("button", { name: entry })).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Aggiungi sottotask" }))
        expect(onAddSubtask).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole("button", { name: "Aggiungi sottotask" })).not.toBeInTheDocument()
    })
})
