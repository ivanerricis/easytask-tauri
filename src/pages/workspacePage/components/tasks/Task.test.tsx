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
import { useNoteDrop } from "../note-dnd-state"

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
    useNoteDrop: vi.fn(() => ({ setNodeRef: () => { }, zone: null, active: null })),
    useNoteDrag: () => ({
        setNodeRef: () => { }, setActivatorNodeRef: () => { },
        attributes: { role: "button", "aria-roledescription": "draggable", tabIndex: 0 }, listeners: {}, isDragging: false,
    }),
}))
vi.mock("../NoteMoveSubmenus", () => ({ TaskMoveSubmenu: () => null }))
vi.mock("../NoteStepMoves", () => ({ TaskStepMoves: () => null }))
vi.mock("./AddTask", () => ({ AddTask: () => null }))
// Like the real one, it shows only while it is open (ButtonMenuTask mounts its own copy, closed)
vi.mock("./DialogTaskDescription", () => ({ DialogTaskDescription: ({ open }: { open: boolean }) => open ? <div>description dialog</div> : null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))
vi.mock("@/components/dialogs/dialog-add-color", () => ({ DialogAddColor: () => null }))

const showTaskDetails = vi.fn()
const panel: RightPanelContextType = { open: false, setOpen: vi.fn(), tab: "history", setTab: vi.fn(), showTaskDetails, audioInfoFile: null, showAudioInfo: vi.fn() }

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

    it("a click on the checkbox or a toolbar button does not select the row", async () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />)
        // userEvent focuses on mousedown: use fireEvent.click to look at the click alone
        fireEvent.click(screen.getByRole("checkbox"))
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

    it("a right click on the text of the task opens the menu of the task, not the one of a text field", async () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo" })} />)
        const text = screen.getByLabelText("Modifica il testo del task")
        // Read only until the editing opens: the menu of the text fields (cut, copy, paste) does not apply to it
        expect(text).toHaveAttribute("readonly")
        fireEvent.contextMenu(text)
        const entries = await screen.findAllByRole("button", { name: "Mostra dettagli", hidden: true })
        expect(entries.length).toBeGreaterThan(0)
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

    it("opening the edit focuses the field, and Escape works from the keyboard alone", async () => {
        const user = userEvent.setup()
        const field = await edit(user)
        expect(field).toHaveFocus()
        await user.keyboard("x{Escape}")

        expect(renameItem).not.toHaveBeenCalled()
        expect(screen.getByLabelText("Modifica il testo del task")).toHaveValue("Primo")
        expect(document.activeElement).not.toBeNull()
    })

    it("Escape also cancels while the rename error is shown", async () => {
        const user = userEvent.setup()
        // The error tooltip (Radix popper) measures with ResizeObserver, which jsdom lacks
        vi.stubGlobal("ResizeObserver", class { observe() { /* none */ } unobserve() { /* none */ } disconnect() { /* none */ } })
        renameItem.mockRejectedValueOnce(new Error("boom"))
        const field = await edit(user)
        await user.type(field, "x{Enter}")
        await screen.findAllByText(/boom/)
        expect(field).toHaveFocus()
        await user.keyboard("{Escape}")

        expect(screen.getByLabelText("Modifica il testo del task")).toHaveValue("Primo")
        expect(screen.queryByRole("alert")).toBeNull()
    })

    it("Escape works on every edit, not just the first", async () => {
        const user = userEvent.setup()
        const field = await edit(user)
        await user.type(field, "x{Escape}")
        await user.click(screen.getByLabelText("Modifica il testo del task"))
        await user.keyboard("y{Escape}")

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

describe("Task subtasks", () => {
    const parent = makeTask({
        id: 10,
        text: "Genitore",
        subtasks: [makeTask({ id: 11, text: "Uno", completed: true }), makeTask({ id: 12, text: "Due" })],
    })

    it("shows how many direct subtasks are completed", () => {
        renderTasks(<Task task={parent} />)
        expect(screen.getByTitle("1 di 2 sottotask completati")).toHaveTextContent("1/2")
    })

    it("hides the counter when the preference is off", () => {
        renderTasks(<Task task={parent} showSubtaskCount={false} />)
        expect(screen.queryByTitle(/sottotask completati/)).not.toBeInTheDocument()
    })

    it("shows no counter on a task without subtasks", () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Solo" })} />)
        expect(screen.queryByTitle(/sottotask completati/)).not.toBeInTheDocument()
    })

    it("draws the tree connectors only for subtasks", () => {
        const { container } = renderTasks(<>
            <Task task={makeTask({ id: 10, text: "Primo" })} />
            <Task task={makeTask({ id: 11, text: "Sotto" })} depth={1} />
        </>)
        const subtaskBlocks = container.querySelectorAll('[class~="group/subtask"]')
        expect(subtaskBlocks).toHaveLength(1)
        const spans = subtaskBlocks[0].querySelectorAll(":scope > span[aria-hidden]")
        expect(spans).toHaveLength(3)
        // The horizontal tick is always visible: there is no drag handle to make room for
        expect(spans[2].className).not.toContain("opacity-0")
    })

    it("hides the line of the last subtask only on its own level, not on the levels below it", () => {
        const { container } = renderTasks(<Task task={makeTask({ id: 11, text: "Sotto" })} depth={1} />)
        const [through, elbow] = container.querySelectorAll('[class~="group/subtask"] > span[aria-hidden]')
        // A "group-last" variant also matches the descendants of a last subtask: the lines of a deeper level would disappear
        for (const span of [through, elbow]) expect(span.className).not.toContain("group-last")
        expect(through.className).toContain("[.subtask:last-child>&]:hidden")
        expect(elbow.className).toContain("[.subtask:last-child>&]:bg-muted-foreground/45")
    })
})

describe("Task description icon", () => {
    const withSubtasks = [makeTask({ id: 11, text: "Uno", completed: true }), makeTask({ id: 12, text: "Due" })]
    const indicator = () => screen.queryByTestId("description-indicator")

    it("shows an indicator, next to the subtask counter, when the task has a description", () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Genitore", description: "Dettagli", subtasks: withSubtasks })} />)
        expect(indicator()).not.toBeNull()
        expect(indicator()!.querySelector("svg.lucide-align-left")).not.toBeNull()
        // Same group as the counter of the subtasks, and no line of text under the task
        expect(indicator()!.parentElement).toContainElement(screen.getByTitle("1 di 2 sottotask completati"))
        expect(screen.queryByText("Dettagli")).not.toBeInTheDocument()
    })

    it("has the same button in the toolbar that shows on hover, once for the screen readers", () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Genitore", description: "Dettagli" })} />)
        const buttons = screen.getAllByRole("button", { name: "Mostra la descrizione" })
        // The indicator is aria-hidden: only the button of the toolbar is exposed
        expect(buttons).toHaveLength(1)
        expect(buttons[0]).not.toBe(indicator())
        expect(buttons[0].parentElement).toContainElement(screen.getByRole("button", { name: "Mostra dettagli" }))
        expect(indicator()).toHaveAttribute("aria-hidden", "true")
        expect(indicator()).toHaveAttribute("tabindex", "-1")
    })

    it("has neither without a description, or with a blank one", () => {
        const { rerender } = renderTasks(<Task task={makeTask({ id: 10, text: "Genitore", description: "", subtasks: withSubtasks })} />)
        expect(indicator()).toBeNull()
        expect(screen.queryByRole("button", { name: "Mostra la descrizione" })).not.toBeInTheDocument()
        rerender(
            <TabsProvider notes={[makeNote({ id: 1 }), makeNote({ id: 2 })]} workspaceId={null}>
                <OpenNote id={1}><Task task={makeTask({ id: 10, text: "Genitore", description: "  \n  ", subtasks: withSubtasks })} /></OpenNote>
            </TabsProvider>,
        )
        expect(indicator()).toBeNull()
        expect(screen.queryByRole("button", { name: "Mostra la descrizione" })).not.toBeInTheDocument()
    })

    it("is shown alone on a task without subtasks, and also when the subtask counter is turned off", () => {
        const { unmount } = renderTasks(<Task task={makeTask({ id: 10, text: "Solo", description: "Dettagli" })} />)
        expect(indicator()).not.toBeNull()
        unmount()

        renderTasks(<Task task={makeTask({ id: 10, text: "Genitore", description: "Dettagli", subtasks: withSubtasks })} showSubtaskCount={false} />)
        expect(indicator()).not.toBeNull()
        expect(screen.queryByTitle(/sottotask completati/)).not.toBeInTheDocument()
    })

    it("opens the description from the toolbar button and from the indicator", async () => {
        const user = userEvent.setup()
        renderTasks(<Task task={makeTask({ id: 10, text: "Genitore", description: "Dettagli" })} />)
        expect(screen.queryByText("description dialog")).not.toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Mostra la descrizione" }))
        expect(screen.getByText("description dialog")).toBeInTheDocument()
    })

    it("opens the description from the indicator too", async () => {
        const user = userEvent.setup()
        renderTasks(<Task task={makeTask({ id: 10, text: "Genitore", description: "Dettagli" })} />)
        await user.click(indicator()!)
        expect(screen.getByText("description dialog")).toBeInTheDocument()
    })
})

describe("Task rendering", () => {
    it("renders its own subtasks, hiding the completed ones only when asked", () => {
        const parent = makeTask({ id: 10, text: "Genitore", subtasks: [makeTask({ id: 11, text: "Uno", completed: true }), makeTask({ id: 12, text: "Due" })] })
        const { unmount } = renderTasks(<Task task={parent} />)
        expect(screen.getByText("Uno")).toBeInTheDocument()
        unmount()
        renderTasks(<Task task={parent} hideCompleted />)
        expect(screen.queryByText("Uno")).not.toBeInTheDocument()
        expect(screen.getByText("Due")).toBeInTheDocument()
    })

    it("does not re-render a sibling parent when a leaf of another one changes", () => {
        const leaf = makeTask({ id: 11, text: "Foglia", sectionID: 1 })
        const a = makeTask({ id: 10, text: "A", subtasks: [leaf] })
        const b = makeTask({ id: 20, text: "B", subtasks: [makeTask({ id: 21, text: "Altra foglia" })] })
        const ui = (x: typeof a) => (
            <TabsProvider notes={[makeNote({ id: 1 })]} workspaceId={null}>
                <Task task={x} />
                <Task task={b} />
            </TabsProvider>
        )
        const { rerender } = render(ui(a))
        const rendersOf = (id: number) => vi.mocked(useNoteDrop).mock.calls.filter(call => call[1] === id).length
        const before = { a: rendersOf(10), b: rendersOf(20), bLeaf: rendersOf(21) }
        // Structural sharing: only the changed leaf and its ancestor are new objects
        rerender(ui({ ...a, subtasks: [{ ...leaf, completed: true }] }))
        expect(rendersOf(10)).toBeGreaterThan(before.a)
        expect(rendersOf(11)).toBeGreaterThan(0)
        expect(rendersOf(20)).toBe(before.b)
        expect(rendersOf(21)).toBe(before.bLeaf)
    })
})

describe("Task priority flag", () => {
    // SQLite returns the flags as 0/1: a 0 must not be rendered as text next to the task
    it("shows nothing for a priority read from the database as 0", () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo", priority: 0 as unknown as boolean })} />)
        expect(screen.queryByText("0")).not.toBeInTheDocument()
        expect(screen.queryByRole("img", { name: "Priorità alta" })).not.toBeInTheDocument()
    })

    it("shows the flag for a priority read from the database as 1", () => {
        renderTasks(<Task task={makeTask({ id: 10, text: "Primo", priority: 1 as unknown as boolean })} />)
        expect(screen.getByRole("img", { name: "Priorità alta" })).toBeInTheDocument()
    })
})
