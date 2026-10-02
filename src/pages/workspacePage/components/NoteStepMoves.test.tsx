import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NoteDataTree } from "@/types/types"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { GroupStepMoves, SectionStepMoves, TaskStepMoves } from "./NoteStepMoves"

const noteData: { tree: NoteDataTree | null } = { tree: null }
const prefs = { hideCompletedTasks: false }
const moveTaskTo = vi.fn()
const moveSectionTo = vi.fn()
const moveGroupTo = vi.fn()

vi.mock("@/contexts/use-active-note", () => ({ useActiveNote: () => ({ noteDataTree: noteData.tree }) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("./note-dnd-state", () => ({
    useNoteMoves: () => ({ moveTaskTo, moveSectionTo }),
    useGroupMoves: () => ({ moveGroupTo }),
}))

/* group 1: S1 [A, B(done), C], S2 [D]; group 2: S3 [] */
const top = (id: number, text: string, completed = false) => makeTask({ id, sectionID: 1, taskID: null, text, completed })

beforeEach(() => {
    vi.clearAllMocks()
    prefs.hideCompletedTasks = false
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
        expect(screen.getByRole("button", { name: "Sposta su" })).toBeDisabled()

        await userEvent.click(screen.getByRole("button", { name: "Sposta giù" }))

        expect(moveTaskTo).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: null, index: 1 })
        expect(onDone).toHaveBeenCalledTimes(1)
    })

    it("disables Move down on the last task and moves it up one step", async () => {
        render(<TaskStepMoves taskId={3} />)
        expect(screen.getByRole("button", { name: "Sposta giù" })).toBeDisabled()

        await userEvent.click(screen.getByRole("button", { name: "Sposta su" }))

        expect(moveTaskTo).toHaveBeenCalledWith(3, { sectionId: 1, parentTaskId: null, index: 1 })
    })

    it("does nothing when a disabled item is clicked", async () => {
        const onDone = vi.fn()
        render(<TaskStepMoves taskId={1} onDone={onDone} />)
        await userEvent.click(screen.getByRole("button", { name: "Sposta su" }))
        expect(moveTaskTo).not.toHaveBeenCalled()
        expect(onDone).not.toHaveBeenCalled()
    })

    it("jumps over the completed tasks that are hidden", async () => {
        prefs.hideCompletedTasks = true
        render(<TaskStepMoves taskId={1} />)
        await userEvent.click(screen.getByRole("button", { name: "Sposta giù" }))
        expect(moveTaskTo).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: null, index: 2 })
    })

    it("disables both items while the note is not loaded", () => {
        noteData.tree = null
        render(<TaskStepMoves taskId={1} />)
        expect(screen.getByRole("button", { name: "Sposta su" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Sposta giù" })).toBeDisabled()
    })
})

describe("SectionStepMoves", () => {
    it("moves a section down within its group", async () => {
        render(<SectionStepMoves sectionId={1} />)
        expect(screen.getByRole("button", { name: "Sposta su" })).toBeDisabled()
        await userEvent.click(screen.getByRole("button", { name: "Sposta giù" }))
        expect(moveSectionTo).toHaveBeenCalledWith(1, { type: "group", groupId: 1, index: 1 })
    })

    it("has nowhere to go for a section alone in its group", () => {
        render(<SectionStepMoves sectionId={3} />)
        expect(screen.getByRole("button", { name: "Sposta su" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Sposta giù" })).toBeDisabled()
    })
})

describe("GroupStepMoves", () => {
    it("uses left and right, since the groups are in a row", async () => {
        render(<GroupStepMoves groupId={1} />)
        expect(screen.queryByRole("button", { name: "Sposta su" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Sposta a sinistra" })).toBeDisabled()

        await userEvent.click(screen.getByRole("button", { name: "Sposta a destra" }))

        expect(moveGroupTo).toHaveBeenCalledWith(1, 1)
    })

    it("moves the last group to the left", async () => {
        render(<GroupStepMoves groupId={2} />)
        expect(screen.getByRole("button", { name: "Sposta a destra" })).toBeDisabled()
        await userEvent.click(screen.getByRole("button", { name: "Sposta a sinistra" }))
        expect(moveGroupTo).toHaveBeenCalledWith(2, 0)
    })
})
