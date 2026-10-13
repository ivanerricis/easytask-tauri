import { renderHook, waitFor } from "@testing-library/react"
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
    recorder: null as unknown as { record: (command: UndoCommand) => void, track: (promise: Promise<void>) => Promise<void> },
    getDBAutomations: vi.fn(async () => [] as Automation[]),
}))

// Stable like the real actions: new functions on every render would re-run the sync effect
const noteActions = vi.hoisted(() => ({
    getNoteTree: () => mocks.tree,
    setNoteDataTree: (tree: NoteDataTree) => { mocks.tree = tree; mocks.setNoteDataTree(tree) },
    refreshActiveNote: mocks.refreshActiveNote,
}))

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, info: vi.fn(), error: vi.fn() } }))
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteId: () => 1 }))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNote: () => ({ noteDataTree: mocks.tree }),
    useActiveNoteActions: () => noteActions,
}))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ notifyArchiveChanged: mocks.notifyArchiveChanged }) }))
vi.mock("@/contexts/undo/use-undo", () => ({
    // Stable like the real recorder: a new one on every render would re-run the sync effect
    useUndoRecorder: () => mocks.recorder,
    useOptionalUndo: () => ({ undo: vi.fn(), isLatest: () => true }),
}))
vi.mock("@/db/queries/note", () => ({ getDBNoteData: vi.fn(async () => ({ groups: [], sections: [], tasks: [] })) }))
vi.mock("@/db/queries/automation", () => ({
    getDBAutomations: mocks.getDBAutomations,
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

mocks.recorder = { record: command => { mocks.recorded.push(command) }, track: promise => promise }

beforeEach(() => {
    vi.clearAllMocks()
    mocks.recorded = []
    mocks.tree = fresh()
    mocks.rules = [makeRule(1, { type: "group.completed", groupId: null }, [{ type: "archiveGroup" }])]
    mocks.getDBAutomations.mockImplementation(async () => mocks.rules)
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
        // A short title, and the sentence of the rule (which names the group) as the description
        expect(mocks.toastSuccess.mock.calls[0][0]).toBe("Automazione eseguita")
        expect(mocks.toastSuccess.mock.calls[0][1].description).toContain("Sprint")
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

describe("AutomationsProvider state rules (sync)", () => {
    const GREEN = "#00ff00"
    const RED = "#ff0000"
    const stateRules = () => [
        makeRule(1, { type: "section.noOpenTasks", sectionId: null }, [{ type: "setColor", color: GREEN }]),
        makeRule(2, { type: "section.hasOpenTasks", sectionId: null }, [{ type: "setColor", color: RED }]),
    ]
    const sectionColor = (id: number) => mocks.tree!.groups.flatMap(g => g.sections).find(s => s.id === id)?.color
    const written = (call: number) => mocks.applyDBAutomationChanges.mock.calls[call][0] as { sql: string, params: unknown[] }[]
    // The sync of the effect has settled once the colors are in the tree
    const settled = () => waitFor(() => expect(sectionColor(20)).toBe(RED))

    beforeEach(() => { mocks.rules = stateRules() })

    it("applies the colors and writes section and group statements, without a toast or an undo entry", async () => {
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.sync()

        expect(sectionColor(10)).toBe(GREEN)
        expect(sectionColor(20)).toBe(RED)
        expect(mocks.applyDBAutomationChanges).toHaveBeenCalled()
        const sql = written(0).map(s => s.sql).join(" ")
        expect(sql).toContain("UPDATE section SET color")
        expect(mocks.toastSuccess).not.toHaveBeenCalled()
        expect(mocks.recorded).toHaveLength(0)
    })

    it("does nothing without enabled state rules (no write)", async () => {
        mocks.rules = [
            makeRule(1, { type: "group.completed", groupId: null }, [{ type: "setColor", color: GREEN }]),
            makeRule(2, { type: "section.noOpenTasks", sectionId: null }, [{ type: "setColor", color: GREEN }], { enabled: false }),
        ]
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.sync()
        expect(mocks.applyDBAutomationChanges).not.toHaveBeenCalled()
        expect(mocks.setNoteDataTree).not.toHaveBeenCalled()
    })

    it("reads the rules again on every sync", async () => {
        mocks.rules = []
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await result.current.sync()
        expect(mocks.applyDBAutomationChanges).not.toHaveBeenCalled()
        const calls = mocks.getDBAutomations.mock.calls.length

        mocks.rules = stateRules()
        await result.current.sync()
        expect(mocks.getDBAutomations.mock.calls.length).toBe(calls + 1)
        expect(sectionColor(20)).toBe(RED)
    })

    it("runs when a note opens and when tasks or sections change, but not after a color-only change", async () => {
        const { result, rerender } = renderHook(() => useAutomations(), { wrapper })
        void result
        await settled()
        expect(sectionColor(10)).toBe(GREEN)
        // The sync recolors the tree it was given: re-rendering with the colored tree must not sync again
        rerender()
        await new Promise(resolve => setTimeout(resolve, 20))
        const writes = mocks.applyDBAutomationChanges.mock.calls.length
        expect(writes).toBe(1)
        expect(mocks.getDBAutomations.mock.calls.length).toBe(1)

        // Completing the open task of section 20
        const groups = mocks.tree!.groups.map(g => ({
            ...g, sections: g.sections.map(s => s.id === 20 ? { ...s, tasks: s.tasks.map(t => ({ ...t, completed: true })) } : s),
        }))
        mocks.tree = { groups }
        rerender()
        await waitFor(() => expect(sectionColor(20)).toBe(GREEN))
        expect(mocks.applyDBAutomationChanges).toHaveBeenCalledTimes(2)

        // A new task (open) in section 20
        const source = mocks.tree.groups[1].sections[0].tasks[0]
        mocks.tree = { groups: mocks.tree.groups.map(g => ({
            ...g, sections: g.sections.map(s => s.id === 20 ? { ...s, tasks: [...s.tasks, { ...source, id: 22, completed: false }] } : s),
        })) }
        rerender()
        await waitFor(() => expect(sectionColor(20)).toBe(RED))

        // Removing it
        mocks.tree = { groups: mocks.tree.groups.map(g => ({
            ...g, sections: g.sections.map(s => s.id === 20 ? { ...s, tasks: s.tasks.filter(t => t.id !== 22) } : s),
        })) }
        rerender()
        await waitFor(() => expect(sectionColor(20)).toBe(GREEN))

        // A new empty section
        const sectionCalls = mocks.getDBAutomations.mock.calls.length
        const base = mocks.tree.groups[0].sections[0]
        mocks.tree = { groups: mocks.tree.groups.map((g, i) => i === 0 ? { ...g, sections: [...g.sections, { ...base, id: 30, tasks: [], color: null }] } : g) }
        rerender()
        await waitFor(() => expect(sectionColor(30)).toBe(GREEN))
        expect(mocks.getDBAutomations.mock.calls.length).toBeGreaterThan(sectionCalls)

        // A color-only change does not sync
        const before = mocks.getDBAutomations.mock.calls.length
        mocks.tree = { groups: mocks.tree.groups.map(g => ({ ...g, sections: g.sections.map(s => ({ ...s, color: "#123456", title: "x" })) })) }
        rerender()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(mocks.getDBAutomations.mock.calls.length).toBe(before)
    })

    it("reloads the note when the write fails and does not throw", async () => {
        mocks.applyDBAutomationChanges.mockRejectedValueOnce(new Error("boom"))
        const { result } = renderHook(() => useAutomations(), { wrapper })
        await expect(result.current.sync()).resolves.toBeUndefined()
        expect(mocks.refreshActiveNote).toHaveBeenCalled()
        expect(mocks.recorded).toHaveLength(0)
    })
})
