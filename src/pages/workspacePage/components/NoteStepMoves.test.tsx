import { render as rtlRender, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeDefaultSection, makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { DropdownMenu, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DirectStepMoves, GroupStepMoves, SectionStepMoves, TaskStepMoves } from "./NoteStepMoves"
import { useTaskStepMove } from "./use-task-step-move"

const noteData: { tree: NoteDataTree | null } = { tree: null }
const prefs = { hideCompletedTasks: false, completedTasksLast: false }
const moveTaskTo = vi.fn()
const moveSectionTo = vi.fn()
const moveDirectSectionTo = vi.fn()
const moveGroupTo = vi.fn()

vi.mock("@/contexts/use-active-note", () => ({ useActiveNote: () => ({ noteDataTree: noteData.tree }), useActiveNoteActions: () => ({ getNoteTree: () => noteData.tree }) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("./note-dnd-state", () => ({
    useNoteMoves: () => ({ moveTaskTo, moveSectionTo, moveDirectSectionTo }),
    useGroupMoves: () => ({ moveGroupTo }),
}))

/** The steps are menu items, which Radix only renders inside an open menu. */
const render = (ui: React.ReactElement) => rtlRender(
    <DropdownMenu open modal={false}>
        <DropdownMenuContent>{ui}</DropdownMenuContent>
    </DropdownMenu>,
)

/* group 1: S1 [A, B(done), C], S2 [D]; group 2: S3 [] */
const top = (id: number, text: string, completed = false) => makeTask({ id, sectionID: 1, taskID: null, text, completed })

beforeEach(() => {
    vi.clearAllMocks()
    prefs.hideCompletedTasks = false
    prefs.completedTasksLast = false
    noteData.tree = {
        groups: [
            makeGroup({
                id: 1, position: 0, sections: [
                    makeSection({ id: 1, groupID: 1, tasks: [top(1, "A"), top(2, "B", true), top(3, "C")] }),
                    makeSection({ id: 2, groupID: 1, tasks: [] }),
                ],
            }),
            makeGroup({ id: 2, position: 1, sections: [makeSection({ id: 3, groupID: 2 })] }),
        ],
    }
})

describe("TaskStepMoves", () => {
    it("disables Move up on the first task and moves it down one step", async () => {
        const onDone = vi.fn()
        render(<TaskStepMoves taskId={1} onDone={onDone} />)
        expect(screen.getByRole("menuitem", { name: "Sposta su" })).toHaveAttribute("aria-disabled", "true")

        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta giù" }))

        expect(moveTaskTo).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: null, index: 1 })
        expect(onDone).toHaveBeenCalledTimes(1)
    })

    it("disables Move down on the last task and moves it up one step", async () => {
        render(<TaskStepMoves taskId={3} />)
        expect(screen.getByRole("menuitem", { name: "Sposta giù" })).toHaveAttribute("aria-disabled", "true")

        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta su" }))

        expect(moveTaskTo).toHaveBeenCalledWith(3, { sectionId: 1, parentTaskId: null, index: 1 })
    })

    it("does nothing when a disabled item is clicked", async () => {
        const onDone = vi.fn()
        render(<TaskStepMoves taskId={1} onDone={onDone} />)
        await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole("menuitem", { name: "Sposta su" }))
        expect(moveTaskTo).not.toHaveBeenCalled()
        expect(onDone).not.toHaveBeenCalled()
    })

    it("jumps over the completed tasks that are hidden", async () => {
        prefs.hideCompletedTasks = true
        render(<TaskStepMoves taskId={1} />)
        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta giù" }))
        expect(moveTaskTo).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: null, index: 2 })
    })

    it("with the completed tasks last, steps in the displayed order and stops at the edge of the block", async () => {
        prefs.completedTasksLast = true
        // Displayed: A, C, B(done). A goes down over C (stored index 2)
        const { unmount } = render(<TaskStepMoves taskId={1} />)
        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta giù" }))
        expect(moveTaskTo).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: null, index: 2 })
        unmount()
        // C is the last open task, B the only completed one: no step over the block edge
        const last = render(<TaskStepMoves taskId={3} />)
        expect(screen.getByRole("menuitem", { name: "Sposta giù" })).toHaveAttribute("aria-disabled", "true")
        last.unmount()
        render(<TaskStepMoves taskId={2} />)
        expect(screen.getByRole("menuitem", { name: "Sposta su" })).toHaveAttribute("aria-disabled", "true")
    })

    it("disables both items while the note is not loaded", () => {
        noteData.tree = null
        render(<TaskStepMoves taskId={1} />)
        expect(screen.getByRole("menuitem", { name: "Sposta su" })).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("menuitem", { name: "Sposta giù" })).toHaveAttribute("aria-disabled", "true")
    })
})

describe("SectionStepMoves", () => {
    it("moves a section down within its group", async () => {
        render(<SectionStepMoves sectionId={1} />)
        expect(screen.getByRole("menuitem", { name: "Sposta su" })).toHaveAttribute("aria-disabled", "true")
        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta giù" }))
        expect(moveSectionTo).toHaveBeenCalledWith(1, { type: "group", groupId: 1, index: 1 })
    })

    it("has nowhere to go for a section alone in its group", () => {
        render(<SectionStepMoves sectionId={3} />)
        expect(screen.getByRole("menuitem", { name: "Sposta su" })).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("menuitem", { name: "Sposta giù" })).toHaveAttribute("aria-disabled", "true")
    })
})

describe("SectionStepMoves with the list of the direct tasks", () => {
    // [S1, (list), S2, S3]
    const withList = (defaultIndex: number) => {
        noteData.tree = { groups: [makeGroup({
            id: 1, defaultIndex, defaultSection: makeDefaultSection({ id: 9, groupID: 1 }),
            sections: [1, 2, 3].map(id => makeSection({ id, groupID: 1 })),
        })] }
    }
    const menu = (name: string) => screen.getByRole("menuitem", { name: new RegExp(`^${name}`) })

    it("a section that would jump over the list moves the list the other way", async () => {
        withList(1)
        render(<SectionStepMoves sectionId={1} />)
        await userEvent.click(menu("Sposta gi"))
        expect(moveDirectSectionTo).toHaveBeenCalledWith(1, 0)
        expect(moveSectionTo).not.toHaveBeenCalled()
    })

    it("up from just after the list moves the list below the section", async () => {
        withList(1)
        render(<SectionStepMoves sectionId={2} />)
        await userEvent.click(menu("Sposta su"))
        expect(moveDirectSectionTo).toHaveBeenCalledWith(1, 2)
    })

    it("a section reaching the end of a group whose list is last stays above it, in one move", async () => {
        withList(3)
        render(<SectionStepMoves sectionId={2} />)
        await userEvent.click(menu("Sposta gi"))
        expect(moveSectionTo).toHaveBeenCalledWith(2, { type: "group", groupId: 1, index: 2, beforeList: true })
        expect(moveDirectSectionTo).not.toHaveBeenCalled()
    })
})

describe("DirectStepMoves", () => {
    // [S1, (list), S2, S3]
    const withList = (defaultIndex: number, sections = [1, 2, 3]) => {
        noteData.tree = { groups: [makeGroup({
            id: 1, defaultIndex, defaultSection: makeDefaultSection({ id: 9, groupID: 1 }),
            sections: sections.map(id => makeSection({ id, groupID: 1 })),
        })] }
    }

    it("moves the list one section down or up, with its own labels", async () => {
        withList(1)
        const onDone = vi.fn()
        render(<DirectStepMoves groupId={1} onDone={onDone} />)
        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta lista task giù" }))
        expect(moveDirectSectionTo).toHaveBeenLastCalledWith(1, 2)
        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta lista task su" }))
        expect(moveDirectSectionTo).toHaveBeenLastCalledWith(1, 0)
        expect(onDone).toHaveBeenCalledTimes(2)
    })

    it("disables up on top and down at the bottom", () => {
        withList(0)
        const { unmount } = render(<DirectStepMoves groupId={1} />)
        expect(screen.getByRole("menuitem", { name: "Sposta lista task su" })).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("menuitem", { name: "Sposta lista task giù" })).not.toHaveAttribute("aria-disabled", "true")
        unmount()
        withList(3)
        render(<DirectStepMoves groupId={1} />)
        expect(screen.getByRole("menuitem", { name: "Sposta lista task giù" })).toHaveAttribute("aria-disabled", "true")
    })

    it("has nowhere to go in a group without sections", () => {
        withList(0, [])
        render(<DirectStepMoves groupId={1} />)
        expect(screen.getByRole("menuitem", { name: "Sposta lista task su" })).toHaveAttribute("aria-disabled", "true")
        expect(screen.getByRole("menuitem", { name: "Sposta lista task giù" })).toHaveAttribute("aria-disabled", "true")
    })
})

describe("GroupStepMoves", () => {
    it("uses left and right, since the groups are in a row", async () => {
        render(<GroupStepMoves groupId={1} />)
        expect(screen.queryByRole("menuitem", { name: "Sposta su" })).not.toBeInTheDocument()
        expect(screen.getByRole("menuitem", { name: "Sposta a sinistra" })).toHaveAttribute("aria-disabled", "true")

        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta a destra" }))

        expect(moveGroupTo).toHaveBeenCalledWith(1, 1)
    })

    it("moves the last group to the left", async () => {
        render(<GroupStepMoves groupId={2} />)
        expect(screen.getByRole("menuitem", { name: "Sposta a destra" })).toHaveAttribute("aria-disabled", "true")
        await userEvent.click(screen.getByRole("menuitem", { name: "Sposta a sinistra" }))
        expect(moveGroupTo).toHaveBeenCalledWith(2, 0)
    })
})

describe("useTaskStepMove", () => {
    it("moves the task one step and resolves true", async () => {
        const { result } = renderHook(() => useTaskStepMove(1))
        expect(await result.current(1)).toBe(true)
        expect(moveTaskTo).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: null, index: 1 })
    })

    it("resolves false and moves nothing at the edge of the list", async () => {
        const { result } = renderHook(() => useTaskStepMove(1))
        expect(await result.current(-1)).toBe(false)
        expect(moveTaskTo).not.toHaveBeenCalled()
    })

    it("reads the tree when called, not when rendered", async () => {
        const { result } = renderHook(() => useTaskStepMove(3))
        noteData.tree = null
        expect(await result.current(-1)).toBe(false)
        expect(moveTaskTo).not.toHaveBeenCalled()
    })
})
