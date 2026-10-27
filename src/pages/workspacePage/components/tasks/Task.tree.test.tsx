import { useEffect, useState } from "react"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TabsProvider } from "@/contexts/tabs-context"
import { useTabsActions } from "@/contexts/use-tabs"
import { PreferencesContext } from "@/contexts/preferences-context-object"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree, Task as TaskType } from "@/types/types"
import { TaskList } from "./TaskList"
import { NoteAnnouncer } from "./NoteAnnouncer"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

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
const recorder = { rename: vi.fn(), taskCompletion: vi.fn(), track: <T,>(write: Promise<T>) => write }
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

function Harness() {
    const { openNote } = useTabsActions()
    const [tasks, set] = useState(initial)
    useEffect(() => { openNote(1) }, [openNote])
    useEffect(() => {
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

const setup = () => render(
    <TabsProvider notes={[makeNote({ id: 1 })]} workspaceId={null}>
        <PreferencesContext.Provider value={{ showTaskInsertLine: true, taskDensity: "normal" } as never}>
            <Harness />
            <NoteAnnouncer />
        </PreferencesContext.Provider>
    </TabsProvider>,
)

const row = (id: number) => document.querySelector(`[data-task-id="${id}"]`) as HTMLElement

beforeEach(() => {
    vi.clearAllMocks()
    updateTaskCompletion.mockResolvedValue(undefined)
})

describe("roles and aria", () => {
    it("the list is a tree with a name, the tasks its items and the subtasks a group one level down", () => {
        setup()
        const tree = screen.getByRole("tree", { name: "Fare" })
        expect(tree).toContainElement(row(10))
        expect(screen.getAllByRole("treeitem")).toHaveLength(4)
        expect(row(10)).toHaveAttribute("aria-level", "1")
        expect(row(13)).toHaveAttribute("aria-level", "2")
        const group = screen.getByRole("group")
        expect(group).toContainElement(row(13))
        expect(group).not.toContainElement(row(12))
    })

    it("aria-expanded only on a task with subtasks, aria-selected follows the selection", async () => {
        setup()
        expect(row(10)).not.toHaveAttribute("aria-expanded")
        expect(row(12)).toHaveAttribute("aria-expanded", "true")
        expect(row(10)).toHaveAttribute("aria-selected", "false")
        await userEvent.click(row(10))
        expect(row(10)).toHaveAttribute("aria-selected", "true")
        expect(row(11)).toHaveAttribute("aria-selected", "false")
    })

    it("the lines and fields of a new task are not items of the tree", () => {
        setup()
        expect(screen.getByRole("tree").querySelectorAll("[role=treeitem]")).toHaveLength(4)
        expect(document.querySelectorAll("[tabindex='0']")).toHaveLength(1)
    })
})

describe("roving tabindex", () => {
    it("the first task is the only tab stop, then the one that had the focus", () => {
        setup()
        const tabIndexes = () => [10, 11, 12, 13].map(id => row(id).getAttribute("tabindex"))
        expect(tabIndexes()).toEqual(["0", "-1", "-1", "-1"])
        act(() => row(12).focus())
        expect(tabIndexes()).toEqual(["-1", "-1", "0", "-1"])
    })
})
