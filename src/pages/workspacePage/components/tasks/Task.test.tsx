import { useEffect } from "react"
import type { ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Task } from "./Task"
import { TabsProvider } from "@/contexts/tabs-context"
import { useSelectedTask, useTabsActions } from "@/contexts/use-tabs"
import { RightPanelContext, type RightPanelContextType } from "../rightbar/right-panel-context-object"
import { makeNote, makeTask } from "@/test/ui-fixtures"

const updateTaskCompletion = vi.fn()
const renameItem = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({
        updateTaskCompletion, renameItem, updateTaskPriority: vi.fn(), updateTaskDescription: vi.fn(), updateItemColor: vi.fn(),
    }),
}))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNoteActions: () => ({ patchTask: () => () => { }, removeTask: vi.fn() }),
}))
vi.mock("../note-dnd-state", () => ({
    useNoteDrop: () => ({ setNodeRef: () => { }, zone: null, active: null }),
    useNoteDrag: () => ({
        setNodeRef: () => { }, setActivatorNodeRef: () => { },
        attributes: { role: "button", "aria-roledescription": "draggable", tabIndex: 0 }, listeners: {}, isDragging: false,
    }),
}))
vi.mock("../NoteMoveSubmenus", () => ({ TaskMoveSubmenu: () => null }))
vi.mock("./AddTask", () => ({ AddTask: () => null }))
vi.mock("./DialogTaskDescription", () => ({ DialogTaskDescription: () => <div>description dialog</div> }))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))
vi.mock("@/components/dialogs/dialog-add-color", () => ({ DialogAddColor: () => null }))

const showTaskDetails = vi.fn()
const panel: RightPanelContextType = { open: false, setOpen: vi.fn(), tab: "history", setTab: vi.fn(), showTaskDetails }

function OpenNote({ id, children }: { id: number, children: ReactNode }) {
    const { openNote } = useTabsActions()
    useEffect(() => { openNote(id) }, [openNote, id])
    return <>{children}</>
}

/** Shows the selection of the note and lets a test switch note. */
function Probe() {
    const { activateNote, openNote } = useTabsActions()
    const [selected] = useSelectedTask(1)
    const [selected2] = useSelectedTask(2)
    return (
        <>
            <output data-testid="selected-1">{String(selected)}</output>
            <output data-testid="selected-2">{String(selected2)}</output>
            <button onClick={() => openNote(2)}>go 2</button>
            <button onClick={() => activateNote(1)}>go 1</button>
        </>
    )
}

const renderTasks = (ui: ReactNode, withPanel = true) => render(
    <TabsProvider notes={[makeNote({ id: 1 }), makeNote({ id: 2 })]} workspaceId={null}>
        <OpenNote id={1}>
            <RightPanelContext.Provider value={withPanel ? panel : null}>{ui}<Probe /></RightPanelContext.Provider>
        </OpenNote>
    </TabsProvider>,
)

beforeEach(() => { vi.clearAllMocks() })

describe("Task selection", () => {
    const tasks = (
        <>
            <Task task={makeTask({ id: 10, text: "Primo" })} />
            <Task task={makeTask({ id: 11, text: "Secondo" })} />
        </>
    )
    const rowOf = (id: number) => document.querySelector(`[data-task-id="${id}"]`) as HTMLElement
    const selected = () => document.querySelectorAll("[data-selected='true']")

    it("starts with nothing selected", () => {
        renderTasks(tasks)
        expect(selected()).toHaveLength(0)
        expect(screen.getByTestId("selected-1")).toHaveTextContent("null")
    })

    it("selects the task with a click on the row and highlights it", async () => {
        renderTasks(tasks)
        const first = rowOf(10)
        fireEvent.click(first)
        expect(screen.getByTestId("selected-1")).toHaveTextContent("10")
        expect(first).toHaveAttribute("data-selected", "true")
        expect(first).toHaveAttribute("aria-current", "true")
        expect(first.className).toContain("bg-accent")
        expect(selected()).toHaveLength(1)

        fireEvent.click(rowOf(11))
        expect(screen.getByTestId("selected-1")).toHaveTextContent("11")
        expect(rowOf(10)).not.toHaveAttribute("data-selected")
        expect(rowOf(11)).toHaveAttribute("data-selected", "true")
    })

    it("selects the task when the focus enters the row", async () => {
        renderTasks(tasks)
        const checkboxes = screen.getAllByRole("checkbox")
        act(() => checkboxes[1].focus())
        expect(screen.getByTestId("selected-1")).toHaveTextContent("11")
    })

    it("a click on the text selects the task and still opens the editing", async () => {
        const user = userEvent.setup()
        renderTasks(tasks)
        await user.click(screen.getAllByLabelText("Modifica il testo del task")[0])
        expect(screen.getByTestId("selected-1")).toHaveTextContent("10")
        // The text became an editable field without the "edit" label
        expect(screen.getAllByLabelText("Modifica il testo del task")).toHaveLength(1)
        expect(screen.getByDisplayValue("Primo")).not.toHaveAttribute("aria-label")
    })

    it("a click on the checkbox, the drag handle or a toolbar button does not select the row", async () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />)
        // userEvent focuses on mousedown: use fireEvent.click to look at the click alone
        fireEvent.click(screen.getByRole("checkbox"))
        fireEvent.click(screen.getByLabelText("Sposta task"))
        fireEvent.click(screen.getByRole("button", { name: "Aggiungi sottotask" }))
        expect(screen.getByTestId("selected-1")).toHaveTextContent("null")
    })

    it("the Details button selects the task and opens the panel on its details", async () => {
        const user = userEvent.setup()
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />)
        await user.click(screen.getByRole("button", { name: "Mostra dettagli" }))
        expect(showTaskDetails).toHaveBeenCalledWith(10)
    })

    it("the Details button only selects the task where there is no panel", async () => {
        const user = userEvent.setup()
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />, false)
        await user.click(screen.getByRole("button", { name: "Mostra dettagli" }))
        expect(showTaskDetails).not.toHaveBeenCalled()
        expect(screen.getByTestId("selected-1")).toHaveTextContent("10")
    })

    it("keeps the selection per note", async () => {
        const user = userEvent.setup()
        renderTasks(tasks)
        fireEvent.click(rowOf(10))
        await user.click(screen.getByRole("button", { name: "go 2" }))
        expect(screen.getByTestId("selected-2")).toHaveTextContent("null")
        expect(selected()).toHaveLength(0)
        await user.click(screen.getByRole("button", { name: "go 1" }))
        expect(screen.getByTestId("selected-1")).toHaveTextContent("10")
        expect(selected()).toHaveLength(1)
    })

    it("the context menu entry shows the details of the right clicked task", async () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />)
        fireEvent.contextMenu(rowOf(10))
        const entries = await screen.findAllByRole("button", { name: "Mostra dettagli", hidden: true })
        fireEvent.click(entries[entries.length - 1])
        expect(showTaskDetails).toHaveBeenCalledWith(10)
    })

    it("does not break the toggle of the completion", async () => {
        const user = userEvent.setup()
        updateTaskCompletion.mockResolvedValue(undefined)
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />)
        await user.click(screen.getByRole("checkbox"))
        expect(updateTaskCompletion).toHaveBeenCalledWith(10, true)
    })
})

describe("Task text editing", () => {
    const edit = async (user: ReturnType<typeof userEvent.setup>, text = "Primo") => {
        renderTasks(<Task task={makeTask({ id: 10, text })} />)
        await user.click(screen.getByLabelText("Modifica il testo del task"))
        return screen.getByDisplayValue(text)
    }

    it("Escape cancels the edit: restores the text and does not rename", async () => {
        const user = userEvent.setup()
        const field = await edit(user)
        await user.type(field, " modificato{Escape}")

        expect(renameItem).not.toHaveBeenCalled()
        expect(screen.getByLabelText("Modifica il testo del task")).toHaveValue("Primo")
    })

    it("Enter saves once (the blur on unmount does not save again)", async () => {
        const user = userEvent.setup()
        const field = await edit(user)
        await user.type(field, "x{Enter}")

        await waitFor(() => expect(renameItem).toHaveBeenCalledTimes(1))
        expect(renameItem).toHaveBeenCalledWith("task", 10, "Primox")
    })

    it("does not rename for a whitespace-only change", async () => {
        const user = userEvent.setup()
        const field = await edit(user)
        await user.type(field, "   {Enter}")

        await waitFor(() => expect(screen.getByLabelText("Modifica il testo del task")).toBeInTheDocument())
        expect(renameItem).not.toHaveBeenCalled()
    })

    it("labels the priority indicator", () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo", priority: true })} />)
        expect(screen.getByRole("img", { name: "Priorità alta" })).toBeInTheDocument()
    })
})
