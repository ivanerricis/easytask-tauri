import { useEffect, useState } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { flushAsync } from "@/test/ui-render"
import { makeUndoRecorderMock } from "@/test/mocks"
import { TabsProvider } from "@/contexts/tabs-context"
import { useTabsActions } from "@/contexts/use-tabs"
import { PreferencesContext } from "@/contexts/preferences-context-object"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree, Task as TaskType } from "@/types/types"
import { TaskList } from "./TaskList"
import { NoteAnnouncer } from "./NoteAnnouncer"
import { createSelectionStore } from "../sidebar/selection"
import { TaskSelectionContext } from "./use-task-selection"
import { useSelectedTask } from "@/contexts/use-tabs"

vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
const sub = makeTask({ id: 13, sectionID: 10, taskID: 12, text: "Sotto" })
const initial: TaskType[] = [
    makeTask({ id: 10, text: "Primo" }),
    makeTask({ id: 11, text: "Secondo" }),
    makeTask({ id: 12, text: "Terzo", subtasks: [sub] }),
].map(task => ({ ...task, sectionID: 10 }))

const updateTaskCompletion = vi.fn()
const patchTask = vi.fn((id: number, patch: Partial<TaskType>) => { applyPatch(id, patch); return () => { } })
// The note as the harness holds it: the open or closed state of a task is read from it
const treeOf = (tasks: TaskType[]): NoteDataTree => ({ groups: [makeGroup({ id: 1, sections: [makeSection({ id: 10, tasks })] })] })
let tree = treeOf([])
const listeners = new Set<() => void>()
let applyPatch: (id: number, patch: Partial<TaskType>) => void = () => { }
const moveTaskTo = vi.fn()
const dispatch = vi.fn()
const recorder = makeUndoRecorderMock()
let order: number[] = []

vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ updateTaskCompletion, renameItem: vi.fn(), updateTaskPriority: vi.fn(), updateTaskDescription: vi.fn(), updateItemColor: vi.fn(), archiveItem: vi.fn() }),
}))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNote: () => ({ noteDataTree: null }),
    useActiveNoteActions: () => ({ patchTask, removeTask: vi.fn(() => () => { }), getNoteTree: () => tree, getCachedNoteTree: () => tree, subscribeNoteTree: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } }),
}))
vi.mock("@/contexts/workspace-data/context", () => ({ useWorkspaceActions: () => ({ setCollapsed: vi.fn() }) }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => recorder, useOptionalUndo: () => null }))
vi.mock("@/hooks/use-automations", () => ({ useAutomations: () => ({ dispatch }) }))
vi.mock("../note-dnd-state", () => ({
    useNoteDndSelector: (select: (state: unknown) => unknown) => select({ active: null }),
    useNoteDrop: () => ({ setNodeRef: () => { }, zone: null, active: null }),
    useNoteDrag: () => ({ setNodeRef: () => { }, dragProps: {}, isDragging: false }),
    useNoteMoves: () => ({ moveTaskTo }),
}))
// The step is the neighbour in the order of the harness (null at the edges)
vi.mock("../note-steps", () => ({
    getTaskStep: (_tree: unknown, id: number, step: number) => {
        const index = order.indexOf(id)
        return order[index + step] === undefined ? null : { to: order[index + step] }
    },
}))
vi.mock("../NoteMoveSubmenus", () => ({ TaskMoveSubmenu: () => null }))
vi.mock("../NoteStepMoves", () => ({ TaskStepMoves: () => null }))
vi.mock("./AddTask", () => ({ AddTask: () => null }))
vi.mock("./DialogTaskDescription", () => ({ DialogTaskDescription: () => null }))
vi.mock("@/components/dialogs/dialog-delete", () => ({ DialogDeleteItem: () => null }))

let setTasks: (tasks: TaskType[]) => void = () => { }

function Harness() {
    const { openNote } = useTabsActions()
    const [tasks, set] = useState(initial)
    useEffect(() => { openNote(1) }, [openNote])
    useEffect(() => {
        setTasks = set
        applyPatch = (id, patch) => {
            const apply = (list: TaskType[]): TaskType[] => list.map(task => ({ ...(task.id === id ? { ...task, ...patch } : task), subtasks: apply(task.subtasks) }))
            act(() => set(current => apply(current)))
        }
    }, [set])
    useEffect(() => {
        order = tasks.map(task => task.id)
        tree = treeOf(tasks)
        listeners.forEach(listener => listener())
    }, [tasks])
    moveTaskTo.mockImplementation(async (id: number, target: { to: number }) => {
        const list = [...tasks]
        const from = list.findIndex(task => task.id === id)
        const to = list.findIndex(task => task.id === target.to)
        const [moved] = list.splice(from, 1)
        list.splice(to, 0, moved)
        act(() => set(list))
    })
    return <TaskList tasks={tasks} listKey="s-10" sectionId={10} label="Fare" />
}

function Probe() {
    const [selected] = useSelectedTask(1)
    return <div data-testid="selected">{String(selected)}</div>
}

let store: ReturnType<typeof createSelectionStore>

const setup = () => render(
    <TabsProvider notes={[makeNote({ id: 1 })]} workspaceId={null}>
        <PreferencesContext.Provider value={{ showTaskInsertLine: true, taskDensity: "normal" } as never}>
            <TaskSelectionContext.Provider value={store}>
                <Harness />
            </TaskSelectionContext.Provider>
            <NoteAnnouncer />
            <Probe />
        </PreferencesContext.Provider>
    </TabsProvider>,
)
const multi = () => Array.from(document.querySelectorAll("[data-multi-selected='true']")).map(el => Number(el.getAttribute("data-task-id")))

const row = (id: number) => document.querySelector(`[data-task-id="${id}"]`) as HTMLElement
const focused = () => Number((document.activeElement as HTMLElement | null)?.getAttribute("data-task-id"))
const press = (id: number, key: string, init: Record<string, boolean> = {}) => { row(id).focus(); fireEvent.keyDown(row(id), { key, ...init }) }

beforeEach(() => {
    vi.clearAllMocks()
    store = createSelectionStore()
    store.sync(["task-10", "task-11", "task-12", "task-13"])
    updateTaskCompletion.mockResolvedValue(undefined)
})

describe("keys", () => {
    it("the focus ring of a row is 3px and drawn inside the row, where the card of the section does not clip it", () => {
        setup()
        expect(row(10)).toHaveClass("focus-visible:outline-3", "focus-visible:outline-offset-[-2px]")
    })

    it("Down / Up move to the next / previous visible row of the list, subtasks included, and stop at the edges", () => {
        setup()
        press(10, "ArrowDown")
        expect(focused()).toBe(11)
        press(11, "ArrowDown")
        press(12, "ArrowDown")
        expect(focused()).toBe(13)
        press(13, "ArrowDown")
        expect(focused()).toBe(13)
        press(13, "ArrowUp")
        expect(focused()).toBe(12)
        press(10, "ArrowUp")
        expect(focused()).toBe(10)
    })

    it("Home and End go to the first and last row", () => {
        setup()
        press(11, "End")
        expect(focused()).toBe(13)
        press(13, "Home")
        expect(focused()).toBe(10)
    })

    it("Left closes an open task, Right opens it, then Right goes to the first subtask and Left to the parent", () => {
        setup()
        press(12, "ArrowLeft")
        expect(row(12)).toHaveAttribute("aria-expanded", "false")
        expect(row(13)).toBeNull()
        press(12, "ArrowRight")
        expect(row(12)).toHaveAttribute("aria-expanded", "true")
        press(12, "ArrowRight")
        expect(focused()).toBe(13)
        press(13, "ArrowLeft")
        expect(focused()).toBe(12)
    })

    it("Space completes the task and keeps the focus on the row", () => {
        setup()
        press(11, " ")
        expect(patchTask).toHaveBeenCalledWith(11, { completed: true })
        expect(updateTaskCompletion).toHaveBeenCalledWith(11, true)
        expect(focused()).toBe(11)
    })

    it("Enter starts the rename, and the focus goes back to the row when it ends", async () => {
        setup()
        row(11).focus()
        await userEvent.keyboard("{Enter}")
        const field = await screen.findByDisplayValue("Secondo")
        expect(field).toHaveFocus()
        await userEvent.keyboard("{Escape}")
        await waitFor(() => expect(row(11)).toHaveFocus())
    })

    it("Shift+F10 and the menu key open the menu of the task", async () => {
        setup()
        press(11, "F10", { shiftKey: true })
        expect(await screen.findByRole("menu")).toBeInTheDocument()
    })

    it("the menu key opens it too", async () => {
        setup()
        press(10, "ContextMenu")
        expect(await screen.findByRole("menu")).toBeInTheDocument()
    })

    it("keys with Ctrl or Meta, and keys that come from inside the row, are left alone", () => {
        setup()
        press(10, "ArrowDown", { ctrlKey: true })
        expect(focused()).toBe(10)
        press(10, "End", { metaKey: true })
        expect(focused()).toBe(10)
        const checkbox = row(10).querySelector("[role=checkbox]") as HTMLElement
        checkbox.focus()
        fireEvent.keyDown(checkbox, { key: "ArrowDown" })
        expect(checkbox).toHaveFocus()
    })
})

describe("selecting with the keyboard", () => {
    it("Shift+Down extends the selection to the next row, moves the focus, and leaves the details selection alone", () => {
        setup()
        // Focusing the first row shows it in the details, as always
        act(() => row(10).focus())
        expect(screen.getByTestId("selected")).toHaveTextContent("10")
        fireEvent.keyDown(row(10), { key: "ArrowDown", shiftKey: true })
        expect(focused()).toBe(11)
        expect(multi()).toEqual([10, 11])
        expect(screen.getByTestId("selected")).toHaveTextContent("10")
        press(11, "ArrowDown", { shiftKey: true })
        expect(multi()).toEqual([10, 11, 12])
    })

    it("Shift+Up goes back toward the anchor and shrinks the selection", () => {
        setup()
        press(10, "ArrowDown", { shiftKey: true })
        press(11, "ArrowDown", { shiftKey: true })
        press(12, "ArrowUp", { shiftKey: true })
        expect(multi()).toEqual([10, 11])
        expect(focused()).toBe(11)
    })

    it("Shift+Down on the last row selects it and keeps the focus there", () => {
        setup()
        press(13, "ArrowDown", { shiftKey: true })
        expect(focused()).toBe(13)
        expect(multi()).toEqual([13])
    })

    it("Shift+End and Shift+Home extend to the last and first row", () => {
        setup()
        press(11, "End", { shiftKey: true })
        expect(multi()).toEqual([11, 12, 13])
        expect(focused()).toBe(13)
        // The anchor is the row where the range started
        press(13, "Home", { shiftKey: true })
        expect(multi()).toEqual([10, 11])
    })

    it("a plain arrow keeps the selection, and Ctrl+Space then adds a task that is not next to it", () => {
        setup()
        press(10, "ArrowDown", { shiftKey: true })
        press(11, "ArrowDown")
        expect(focused()).toBe(12)
        expect(multi()).toEqual([10, 11])
        press(12, "ArrowDown")
        press(13, " ", { ctrlKey: true })
        expect(multi()).toEqual([10, 11, 13])
        expect(updateTaskCompletion).not.toHaveBeenCalled()
    })

    it("Ctrl+Space and Cmd+Space toggle the focused task", () => {
        setup()
        press(11, " ", { ctrlKey: true })
        expect(multi()).toEqual([11])
        press(11, " ", { metaKey: true })
        expect(multi()).toEqual([])
    })

    it("announces the first selected task and the one that leaves the selection when 1 or 0 are left", async () => {
        setup()
        press(11, " ", { ctrlKey: true })
        expect(await screen.findByText(/Secondo selezionato/)).toBeInTheDocument()
        press(11, " ", { ctrlKey: true })
        expect(await screen.findByText(/Secondo rimosso dalla selezione/)).toBeInTheDocument()
    })

    it("does not announce on its own when 2 or more are selected (the count of the bar does)", async () => {
        setup()
        press(10, " ", { ctrlKey: true })
        press(11, " ", { ctrlKey: true })
        expect(screen.queryByText(/Secondo selezionato/)).not.toBeInTheDocument()
    })

    it("without a selection store Shift+Down moves the focus like Down", () => {
        store = null as never
        setup()
        press(10, "ArrowDown", { shiftKey: true })
        expect(focused()).toBe(11)
        expect(multi()).toEqual([])
    })
})

describe("moving with the keyboard", () => {
    it("Alt+Down moves the task one step, keeps the focus on it and announces the new position", async () => {
        setup()
        press(10, "ArrowDown", { altKey: true })
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Spostato in posizione 2 di 3"))
        expect(moveTaskTo).toHaveBeenCalledWith(10, { to: 11 })
        expect(focused()).toBe(10)
        expect(row(10).compareDocumentPosition(row(11)) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    })

    it("at the edge it announces that it cannot move", async () => {
        setup()
        press(10, "ArrowUp", { altKey: true })
        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Impossibile spostare oltre"))
        expect(moveTaskTo).not.toHaveBeenCalled()
        expect(focused()).toBe(10)
    })
})

describe("focus recovery", () => {
    it("when the focused task disappears the focus goes to the next one, or the previous one at the end", async () => {
        setup()
        act(() => row(11).focus())
        act(() => setTasks(initial.filter(task => task.id !== 11)))
        await waitFor(() => expect(focused()).toBe(12))
        expect(row(12)).toHaveAttribute("tabindex", "0")

        act(() => row(12).focus())
        act(() => setTasks(initial.filter(task => task.id === 10)))
        await waitFor(() => expect(focused()).toBe(10))
    })

    it("does not take the focus when it was somewhere else", async () => {
        setup()
        act(() => row(11).focus())
        const outside = document.createElement("button")
        document.body.appendChild(outside)
        outside.focus()
        act(() => setTasks(initial.filter(task => task.id !== 11)))
        // A real wait on purpose: it asserts that nothing moves the focus, so there is no condition to wait for
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)) })
        expect(outside).toHaveFocus()
        expect(row(12)).toHaveAttribute("tabindex", "0")
        outside.remove()
    })
})

describe("tab stop of a closed task", () => {
    it("when the task that was the tab stop is hidden by closing its parent, the tree keeps a tab stop (the parent, which takes the focus)", async () => {
        setup()
        act(() => row(13).focus())
        expect(row(13)).toHaveAttribute("tabindex", "0")
        // Closed from somewhere else (the menu of the parent, the note menu...): the subtask is no longer drawn
        act(() => applyPatch(12, { collapsed: true }))
        await waitFor(() => expect(row(13)).toBeNull())
        const stops = Array.from(document.querySelectorAll("[role=treeitem][tabindex='0']"))
        expect(stops).toHaveLength(1)
        expect(stops[0]).toBe(row(12))
        await waitFor(() => expect(focused()).toBe(12))
    })

    it("a tab stop that is hidden without any new render of the list is replaced too", async () => {
        setup()
        act(() => row(13).focus())
        act(() => applyPatch(12, { collapsed: true }))
        await flushAsync()
        expect(document.querySelectorAll("[role=treeitem][tabindex='0']")).toHaveLength(1)
    })
})

describe("controls inside the rows", () => {
    it("only the tab stop row has its checkbox, text and buttons in the tab order", () => {
        setup()
        const tabbable = (id: number) => Array.from(row(id).querySelectorAll<HTMLElement>("button, [role=checkbox], textarea")).filter(el => el.getAttribute("tabindex") !== "-1")
        expect(tabbable(10).length).toBeGreaterThan(0)
        expect(tabbable(11)).toHaveLength(0)
        act(() => row(11).focus())
        expect(tabbable(10)).toHaveLength(0)
        expect(tabbable(11).length).toBeGreaterThan(0)
    })
})
