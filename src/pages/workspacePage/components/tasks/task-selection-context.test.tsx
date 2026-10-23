import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree } from "@/types/types"
import {
    TaskSelectionProvider, useIsInTaskMultiSelection, useIsTaskMultiSelected, useSelectedTaskKeys, useTaskSelectionStore,
} from "./task-selection-context"

let activeId: number | null = 1
let hideCompleted = false
const collapsedSections = new Set<number>()
const listeners = new Set<() => void>()
const uiStore = {
    isGroupCollapsed: () => false,
    isSectionCollapsed: (_note: number, sectionId: number) => collapsedSections.has(sectionId),
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
}
const emitUi = () => act(() => listeners.forEach(listener => listener()))

let tree: NoteDataTree | null
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteId: () => activeId, useTabUiStore: () => uiStore }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNote: () => ({ noteDataTree: tree }) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ hideCompletedTasks: hideCompleted }) }))

const makeTree = (): NoteDataTree => ({
    groups: [makeGroup({
        id: 1,
        sections: [
            makeSection({ id: 10, tasks: [makeTask({ id: 1 }), makeTask({ id: 2, completed: true })] }),
            makeSection({ id: 11, tasks: [makeTask({ id: 3 })] }),
        ],
    })],
})

function Probe() {
    const store = useTaskSelectionStore()!
    const keys = useSelectedTaskKeys()
    return (
        <>
            <output data-testid="keys">{[...keys].sort().join(",")}</output>
            <output data-testid="one">{String(useIsTaskMultiSelected(1))}</output>
            <output data-testid="multi">{String(useIsInTaskMultiSelection(1))}</output>
            <button onClick={() => store.toggle("task-1")}>t1</button>
            <button onClick={() => store.toggle("task-2")}>t2</button>
            <button onClick={() => store.toggle("task-3")}>t3</button>
            <button onClick={() => store.selectRange("task-3")}>range3</button>
            <input aria-label="campo" />
        </>
    )
}

const setup = () => render(<TaskSelectionProvider><Probe /></TaskSelectionProvider>)
const keys = () => screen.getByTestId("keys").textContent

beforeEach(() => {
    activeId = 1
    hideCompleted = false
    collapsedSections.clear()
    tree = makeTree()
})

describe("TaskSelectionProvider", () => {
    it("tells whether a task is selected and whether it is part of a multi-selection", () => {
        setup()
        fireEvent.click(screen.getByText("t1"))
        expect(screen.getByTestId("one")).toHaveTextContent("true")
        expect(screen.getByTestId("multi")).toHaveTextContent("false")
        fireEvent.click(screen.getByText("t3"))
        expect(screen.getByTestId("multi")).toHaveTextContent("true")
    })

    it("selects the range in the visible order, skipping the hidden completed tasks", () => {
        hideCompleted = true
        setup()
        fireEvent.click(screen.getByText("t1"))
        fireEvent.click(screen.getByText("range3"))
        expect(keys()).toBe("task-1,task-3")
    })

    it("a range crosses the sections, completed tasks included when they are shown", () => {
        setup()
        fireEvent.click(screen.getByText("t1"))
        fireEvent.click(screen.getByText("range3"))
        expect(keys()).toBe("task-1,task-2,task-3")
    })

    it("drops the tasks of a section that gets closed and the ones that disappear from the note", () => {
        const { rerender } = setup()
        fireEvent.click(screen.getByText("t1"))
        fireEvent.click(screen.getByText("t3"))
        collapsedSections.add(11)
        emitUi()
        expect(keys()).toBe("task-1")
        tree = { groups: [makeGroup({ id: 1, sections: [makeSection({ id: 10, tasks: [] })] })] }
        rerender(<TaskSelectionProvider><Probe /></TaskSelectionProvider>)
        expect(keys()).toBe("")
    })

    it("Esc clears the selection", () => {
        setup()
        fireEvent.click(screen.getByText("t1"))
        fireEvent.keyDown(window, { key: "Escape" })
        expect(keys()).toBe("")
    })

    it("Esc leaves the selection when the focus is in a field or the key was already used", () => {
        setup()
        fireEvent.click(screen.getByText("t1"))
        fireEvent.keyDown(screen.getByLabelText("campo"), { key: "Escape" })
        expect(keys()).toBe("task-1")
        const used = new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
        used.preventDefault()
        act(() => { window.dispatchEvent(used) })
        expect(keys()).toBe("task-1")
    })

    it("is cleared when another note becomes the active one", () => {
        const { rerender } = setup()
        fireEvent.click(screen.getByText("t1"))
        expect(keys()).toBe("task-1")
        activeId = 2
        rerender(<TaskSelectionProvider><Probe /></TaskSelectionProvider>)
        expect(keys()).toBe("")
    })
})
