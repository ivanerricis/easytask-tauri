import { describe, expect, it, vi } from "vitest"
import { UNDO_LIMIT, createUndoHistory, type UndoCommand } from "./stack"
import { deferred } from "@/test/ui-render"

const makeCommand = (label: string, over: Partial<UndoCommand> = {}): UndoCommand & { undo: ReturnType<typeof vi.fn>, redo: ReturnType<typeof vi.fn> } => ({
    label,
    undo: vi.fn().mockResolvedValue(undefined),
    redo: vi.fn().mockResolvedValue(undefined),
    ...over,
}) as never

describe("createUndoHistory", () => {
    it("starts empty and answers 'empty' to undo and redo", async () => {
        const history = createUndoHistory()
        expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null })
        expect(await history.undo()).toEqual({ status: "empty" })
        expect(await history.redo()).toEqual({ status: "empty" })
    })

    it("undoes the last recorded action first and moves it to the redo stack", async () => {
        const history = createUndoHistory()
        const first = makeCommand("first")
        const second = makeCommand("second")
        history.record(first)
        history.record(second)
        expect(history.getSnapshot()).toMatchObject({ canUndo: true, undoLabel: "second", canRedo: false })

        expect(await history.undo()).toEqual({ status: "done", label: "second" })
        expect(second.undo).toHaveBeenCalledTimes(1)
        expect(first.undo).not.toHaveBeenCalled()
        expect(history.getSnapshot()).toMatchObject({ undoLabel: "first", redoLabel: "second", canRedo: true })

        expect(await history.undo()).toEqual({ status: "done", label: "first" })
        expect(history.getSnapshot()).toMatchObject({ canUndo: false, redoLabel: "first" })
    })

    it("redoes in the reverse order and puts the action back on the undo stack", async () => {
        const history = createUndoHistory()
        const first = makeCommand("first")
        const second = makeCommand("second")
        history.record(first)
        history.record(second)
        await history.undo()
        await history.undo()

        expect(await history.redo()).toEqual({ status: "done", label: "first" })
        expect(first.redo).toHaveBeenCalledTimes(1)
        expect(history.getSnapshot()).toMatchObject({ undoLabel: "first", redoLabel: "second" })
        expect(await history.redo()).toEqual({ status: "done", label: "second" })
        expect(history.getSnapshot()).toMatchObject({ undoLabel: "second", canRedo: false })
    })

    it("empties the redo stack when a new action is recorded", async () => {
        const history = createUndoHistory()
        history.record(makeCommand("a"))
        await history.undo()
        expect(history.getSnapshot().canRedo).toBe(true)

        history.record(makeCommand("b"))
        expect(history.getSnapshot()).toMatchObject({ canRedo: false, undoLabel: "b" })
        expect(await history.redo()).toEqual({ status: "empty" })
    })

    it("keeps at most 50 actions, dropping the oldest", async () => {
        expect(UNDO_LIMIT).toBe(50)
        const history = createUndoHistory()
        const commands = Array.from({ length: 55 }, (_, i) => makeCommand(`c${i}`))
        commands.forEach(command => history.record(command))

        let done = 0
        while ((await history.undo()).status === "done") done += 1
        expect(done).toBe(50)
        expect(commands[4].undo).not.toHaveBeenCalled()
        expect(commands[5].undo).toHaveBeenCalledTimes(1)
        expect(commands[54].undo).toHaveBeenCalledTimes(1)
    })

    it("honours a custom limit also when redoing", async () => {
        const history = createUndoHistory(2)
        history.record(makeCommand("a"))
        history.record(makeCommand("b"))
        await history.undo()
        history.record(makeCommand("c"))
        history.record(makeCommand("d"))
        expect(history.getSnapshot().undoLabel).toBe("d")
        let done = 0
        while ((await history.undo()).status === "done") done += 1
        expect(done).toBe(2)
    })

    it("ignores the actions recorded while an undo or redo runs", async () => {
        const history = createUndoHistory()
        const during = makeCommand("during")
        const outer = makeCommand("outer", {
            undo: vi.fn(async () => { history.record(during) }),
            redo: vi.fn(async () => { history.record(during) }),
        })
        history.record(outer)

        await history.undo()
        expect(history.getSnapshot()).toMatchObject({ canUndo: false, redoLabel: "outer" })
        await history.redo()
        expect(history.getSnapshot()).toMatchObject({ undoLabel: "outer", canRedo: false })
    })

    it("records again once the undo is finished", async () => {
        const history = createUndoHistory()
        history.record(makeCommand("a"))
        await history.undo()
        history.record(makeCommand("b"))
        expect(history.getSnapshot().undoLabel).toBe("b")
    })

    it("reports a failed undo without throwing, drops the command and keeps the others", async () => {
        const history = createUndoHistory()
        const error = new Error("boom")
        const ok = makeCommand("ok")
        const bad = makeCommand("bad", { undo: vi.fn().mockRejectedValue(error) })
        history.record(ok)
        history.record(bad)

        expect(await history.undo()).toEqual({ status: "failed", label: "bad", error })
        expect(history.getSnapshot()).toMatchObject({ undoLabel: "ok", canRedo: false })
        expect(await history.undo()).toEqual({ status: "done", label: "ok" })
    })

    it("reports a failed redo, drops the command and leaves the undo stack alone", async () => {
        const history = createUndoHistory()
        const error = new Error("nope")
        const bad = makeCommand("bad", { redo: vi.fn().mockRejectedValue(error) })
        history.record(bad)
        await history.undo()

        expect(await history.redo()).toEqual({ status: "failed", label: "bad", error })
        expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null })
    })

    it("records again after a failure (the running flag is released)", async () => {
        const history = createUndoHistory()
        history.record(makeCommand("bad", { undo: vi.fn().mockRejectedValue(new Error("x")) }))
        await history.undo()
        history.record(makeCommand("next"))
        expect(history.getSnapshot().undoLabel).toBe("next")
    })

    it("serializes quick repeated requests: the second waits for the first", async () => {
        const history = createUndoHistory()
        const gate = deferred()
        const order: string[] = []
        history.record(makeCommand("a", { undo: vi.fn(async () => { order.push("a") }) }))
        history.record(makeCommand("b", { undo: vi.fn(async () => { await gate.promise; order.push("b") }) }))

        const first = history.undo()
        const second = history.undo()
        await Promise.resolve()
        expect(order).toEqual([])
        gate.resolve()
        expect(await first).toEqual({ status: "done", label: "b" })
        expect(await second).toEqual({ status: "done", label: "a" })
        expect(order).toEqual(["b", "a"])
    })

    it("keeps working after a failed request in the queue", async () => {
        const history = createUndoHistory()
        history.record(makeCommand("a"))
        history.record(makeCommand("bad", { undo: vi.fn().mockRejectedValue(new Error("x")) }))
        const results = await Promise.all([history.undo(), history.undo()])
        expect(results.map(r => r.status)).toEqual(["failed", "done"])
    })

    it("clear empties both stacks", async () => {
        const history = createUndoHistory()
        history.record(makeCommand("a"))
        history.record(makeCommand("b"))
        await history.undo()
        history.clear()
        expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null })
        expect(await history.undo()).toEqual({ status: "empty" })
    })

    it("a command that finishes after clear does not enter the history", async () => {
        const history = createUndoHistory()
        const gate = deferred()
        history.record(makeCommand("slow", { undo: vi.fn(() => gate.promise) }))

        const pending = history.undo()
        await Promise.resolve()
        history.clear()
        gate.resolve()

        expect(await pending).toEqual({ status: "done", label: "slow" })
        expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null })
    })

    it("a command that fails after clear leaves the new history untouched", async () => {
        const history = createUndoHistory()
        const gate = deferred()
        history.record(makeCommand("slow", { undo: vi.fn(async () => { await gate.promise; throw new Error("late") }) }))

        const pending = history.undo()
        await Promise.resolve()
        history.clear()
        gate.reject(new Error("late"))

        expect((await pending).status).toBe("failed")
        expect(history.getSnapshot()).toEqual({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null })
        history.record(makeCommand("fresh"))
        expect(history.getSnapshot().undoLabel).toBe("fresh")
    })

    it("notifies the subscribers only when the snapshot changes, and stops after unsubscribe", async () => {
        const history = createUndoHistory()
        const listener = vi.fn()
        const unsubscribe = history.subscribe(listener)

        history.clear()
        expect(listener).not.toHaveBeenCalled()
        const before = history.getSnapshot()
        history.record(makeCommand("a"))
        expect(listener).toHaveBeenCalledTimes(1)
        expect(history.getSnapshot()).not.toBe(before)
        const stable = history.getSnapshot()
        expect(history.getSnapshot()).toBe(stable)

        unsubscribe()
        await history.undo()
        expect(listener).toHaveBeenCalledTimes(1)
    })
})
