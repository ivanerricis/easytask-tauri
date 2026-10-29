import { act, render } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NoteDndProvider } from "./NoteDndProvider"
import { createSelectionStore } from "./sidebar/selection"
import { TaskSelectionContext } from "./tasks/use-task-selection"
import { taskKey } from "./tasks/task-selection"
import { announce } from "./tasks/note-announcer-store"

// DndContext is replaced by a stub that hands its handlers to the test: the pointer sensor needs a real browser
type Handlers = { onDragStart: (event: unknown) => void, onDragCancel: () => void }
let handlers: Handlers
vi.mock("@dnd-kit/core", async importActual => ({
    ...await importActual<typeof import("@dnd-kit/core")>(),
    DndContext: (props: Handlers & { children: ReactNode }) => { handlers = props; return <>{props.children}</> },
    DragOverlay: () => null,
}))
vi.mock("./tasks/note-announcer-store", () => ({ announce: vi.fn() }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNote: () => ({ noteDataTree: null }) }))
vi.mock("@/contexts/use-color-alpha", () => ({ useColorAlpha: () => ({ header: () => 0.5 }) }))
vi.mock("./note-dnd-state", async importActual => ({
    ...await importActual<typeof import("./note-dnd-state")>(),
    useNoteMoves: () => ({ moveSectionTo: vi.fn(), moveTaskTo: vi.fn() }),
    useGroupMoves: () => ({ moveGroupTo: vi.fn() }),
}))

const startDrag = (kind: "task" | "section", id: number) =>
    act(() => handlers.onDragStart({ active: { data: { current: { kind, id } } } }))

describe("NoteDndProvider drag of a selected task", () => {
    const store = createSelectionStore()

    const setup = () => render(
        <TaskSelectionContext.Provider value={store}>
            <NoteDndProvider>{null}</NoteDndProvider>
        </TaskSelectionContext.Provider>,
    )

    beforeEach(() => {
        store.sync([taskKey(1), taskKey(2), taskKey(3)])
        store.reset()
        vi.mocked(announce).mockClear()
    })

    it("clears the multi-selection when a task of it is dragged, and tells it to the screen readers", () => {
        store.toggle(taskKey(1)); store.toggle(taskKey(2))
        setup()
        startDrag("task", 1)
        expect(store.getSelected().size).toBe(0)
        expect(announce).toHaveBeenCalledWith("Viene spostato solo questo task")
    })

    it("leaves the selection alone when the dragged task is not part of it", () => {
        store.toggle(taskKey(1)); store.toggle(taskKey(2))
        setup()
        startDrag("task", 3)
        expect([...store.getSelected()]).toEqual([taskKey(1), taskKey(2)])
        expect(announce).not.toHaveBeenCalled()
    })

    it("leaves a selection of a single task alone, without announcing anything", () => {
        store.toggle(taskKey(1))
        setup()
        startDrag("task", 1)
        expect(store.getSelected().size).toBe(1)
        expect(announce).not.toHaveBeenCalled()
    })

    it("does not touch the selection when a section is dragged", () => {
        store.toggle(taskKey(1)); store.toggle(taskKey(2))
        setup()
        startDrag("section", 1)
        expect(store.getSelected().size).toBe(2)
    })
})
