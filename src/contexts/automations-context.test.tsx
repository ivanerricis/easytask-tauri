import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NoteDataTree } from "@/types/types"
import type { UndoCommand } from "@/contexts/undo/stack"
import type { Automation } from "@/lib/automations/types"
import { groupIds, makeGroups, makeRule, taskOf } from "@/test/automation-fixtures"

const mocks = vi.hoisted(() => ({
    tree: null as NoteDataTree | null,
    rules: [] as Automation[],
    recorded: [] as UndoCommand[],
    setNoteDataTree: vi.fn(),
    refreshActiveNote: vi.fn(async () => {}),
    notifyArchiveChanged: vi.fn(),
    applyDBAutomationChanges: vi.fn(async (...args: unknown[]) => { void args }),
    toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, info: vi.fn(), error: vi.fn() } }))
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteId: () => 1 }))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNoteActions: () => ({
        getNoteTree: () => mocks.tree,
        setNoteDataTree: (tree: NoteDataTree) => { mocks.tree = tree; mocks.setNoteDataTree(tree) },
        refreshActiveNote: mocks.refreshActiveNote,
    }),
}))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ notifyArchiveChanged: mocks.notifyArchiveChanged }) }))
vi.mock("@/contexts/undo/use-undo", () => ({
    useUndoRecorder: () => ({ record: (command: UndoCommand) => mocks.recorded.push(command), track: (promise: Promise<void>) => promise }),
    useOptionalUndo: () => ({ undo: vi.fn(), isLatest: () => true }),
}))
vi.mock("@/db/queries/note", () => ({ getDBNoteData: vi.fn(async () => ({ groups: [], sections: [], tasks: [] })) }))
vi.mock("@/db/queries/automation", () => ({
    getDBAutomations: vi.fn(async () => mocks.rules),
    applyDBAutomationChanges: mocks.applyDBAutomationChanges,
}))

import { AutomationsProvider } from "./automations-context"
import { useAutomations } from "@/hooks/use-automations"

const wrapper = ({ children }: { children: ReactNode }) => <AutomationsProvider>{children}</AutomationsProvider>

// Group 1 has one open task (11), group 2 one task
const fresh = () => makeGroups(
    { 1: { 10: [{ id: 11, completed: true }] }, 2: { 20: [{ id: 21 }] } },
    { 1: "Sprint" },
)

beforeEach(() => {
    vi.clearAllMocks()
    mocks.recorded = []
    mocks.tree = fresh()
    mocks.rules = [makeRule(1, { type: "group.completed", groupId: null }, [{ type: "archiveGroup" }])]
})

describe("AutomationsProvider with group rules", () => {
    it("archives the completed group, writes it, notifies the archive and names it in the toast", async () => {
        mocks.rules = [makeRule(1, { type: "group.completed", groupId: 1 }, [{ type: "archiveGroup" }])]
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.dispatch({ type: "task.completed", taskId: 11 })

        expect(groupIds(mocks.tree!)).toEqual([2])
        expect(mocks.applyDBAutomationChanges).toHaveBeenCalledTimes(1)
        const statements = mocks.applyDBAutomationChanges.mock.calls[0][0] as { sql: string }[]
        expect(statements.some(s => s.sql.includes("archived_at = datetime"))).toBe(true)
        expect(mocks.notifyArchiveChanged).toHaveBeenCalledTimes(1)
        expect(mocks.recorded).toHaveLength(1)
        expect(mocks.toastSuccess).toHaveBeenCalledTimes(1)
        expect(mocks.toastSuccess.mock.calls[0][0]).toContain("Sprint")
    })

    it("undo brings the group back and redo archives it again, notifying each time", async () => {
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.dispatch({ type: "task.completed", taskId: 11 })
        const [command] = mocks.recorded
        mocks.notifyArchiveChanged.mockClear()
        mocks.applyDBAutomationChanges.mockClear()

        await command.undo()
        expect(groupIds(mocks.tree!)).toEqual([1, 2])
        expect(mocks.tree!.groups.find(g => g.id === 1)?.sections[0].tasks[0].id).toBe(11)
        const undone = mocks.applyDBAutomationChanges.mock.calls[0][0] as { sql: string }[]
        expect(undone.some(s => s.sql.includes("archived_at = NULL"))).toBe(true)
        expect(mocks.notifyArchiveChanged).toHaveBeenCalledTimes(1)

        await command.redo()
        expect(groupIds(mocks.tree!)).toEqual([2])
        expect(mocks.notifyArchiveChanged).toHaveBeenCalledTimes(2)
    })

    it("does not notify the archive when a group is only recolored", async () => {
        mocks.rules = [makeRule(1, { type: "group.completed", groupId: 1 }, [{ type: "setColor", color: "#112233" }])]
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.dispatch({ type: "task.completed", taskId: 11 })

        expect(mocks.tree!.groups.find(g => g.id === 1)?.color).toBe("#112233")
        expect(mocks.applyDBAutomationChanges).toHaveBeenCalledTimes(1)
        expect(mocks.notifyArchiveChanged).not.toHaveBeenCalled()
    })

    it("reloads the note and notifies nothing when the write fails", async () => {
        mocks.applyDBAutomationChanges.mockRejectedValueOnce(new Error("boom"))
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.dispatch({ type: "task.completed", taskId: 11 })

        expect(mocks.refreshActiveNote).toHaveBeenCalled()
        expect(mocks.notifyArchiveChanged).not.toHaveBeenCalled()
        expect(mocks.recorded).toHaveLength(0)
    })

    describe("tasks changed in a group the same run archives", () => {
        // Task 11 (completed) has the open subtask 12: completing it finishes group 1, which is archived
        beforeEach(() => {
            mocks.tree = makeGroups({ 1: { 10: [{ id: 11, completed: true, subs: [{ id: 12 }] }] }, 2: { 20: [{ id: 21 }] } }, { 1: "Sprint" })
            mocks.rules = [
                makeRule(1, { type: "task.completed", sectionId: null }, [{ type: "completeSubtasks" }]),
                makeRule(2, { type: "group.completed", groupId: 1 }, [{ type: "archiveGroup" }]),
            ]
        })
        const written = (call: number) => mocks.applyDBAutomationChanges.mock.calls[call][0] as { sql: string, params: unknown[] }[]
        const completes = (call: number, id: number, value: 0 | 1) =>
            written(call).some(s => s.sql === "UPDATE task SET completed = ? WHERE id = ?" && s.params[0] === value && s.params[1] === id)
        const sqlHas = (call: number, text: string) => written(call).some(s => s.sql.includes(text))

        it("writes the completed subtasks of the archived group together with the archive", async () => {
            const { result } = renderHook(() => useAutomations(), { wrapper })
            await result.current.dispatch({ type: "task.completed", taskId: 11 })
            expect(groupIds(mocks.tree!)).toEqual([2])
            expect(sqlHas(0, "archived_at = datetime")).toBe(true)
            expect(completes(0, 12, 1)).toBe(true)
        })

        it("undo reopens the subtasks and unarchives the group, redo does both again", async () => {
            const { result } = renderHook(() => useAutomations(), { wrapper })
            await result.current.dispatch({ type: "task.completed", taskId: 11 })
            const [command] = mocks.recorded

            await command.undo()
            expect(groupIds(mocks.tree!)).toEqual([1, 2])
            expect(taskOf(mocks.tree!, 12).completed).toBeFalsy()
            expect(sqlHas(1, "archived_at = NULL")).toBe(true)
            expect(completes(1, 12, 0)).toBe(true)

            await command.redo()
            expect(groupIds(mocks.tree!)).toEqual([2])
            expect(sqlHas(2, "archived_at = datetime")).toBe(true)
            expect(completes(2, 12, 1)).toBe(true)
        })
    })
})
