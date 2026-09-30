import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ButtonMenuTask } from "./ButtonMenuTask"
import { ItemMenuButton } from "@/components/item-menu"
import { makeTask } from "@/test/ui-fixtures"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceActions: () => ({
        updateTaskPriority: vi.fn(),
        updateTaskDescription: vi.fn(),
        updateItemColor: vi.fn(),
    }),
}))
vi.mock("@/contexts/tabs-context", () => ({ useActiveNoteId: () => null }))
vi.mock("@/contexts/active-note-context", () => ({
    useActiveNoteActions: () => ({ getNoteData: vi.fn(), refreshActiveNote: vi.fn(), patchTask: vi.fn(() => () => {}) }),
}))
vi.mock("../NoteMoveSubmenus", () => ({ TaskMoveSubmenu: () => null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))
vi.mock("./DialogTaskDescription", () => ({ DialogTaskDescription: () => null }))

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
