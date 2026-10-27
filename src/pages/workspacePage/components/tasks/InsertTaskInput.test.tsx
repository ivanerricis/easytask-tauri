import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useEffect } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { TaskInsertProvider, useTaskInsertStore } from "./task-insert-state"
import { InsertTaskInput } from "./InsertTaskInput"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const ctx = {
    insertTaskAfter: vi.fn(),
    appendTask: vi.fn(),
}
const recorder = { create: vi.fn() }
const dispatch = vi.fn()
let prefs = { taskDensity: "normal", keepAddingTasks: false }
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ctx }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ctx }))
vi.mock("@/contexts/undo/use-undo", () => ({ useUndoRecorder: () => recorder }))
vi.mock("@/hooks/use-automations", () => ({ useAutomations: () => ({ dispatch }) }))

type Store = ReturnType<typeof useTaskInsertStore>
const setup = (open = true, parent: { sectionId: number } | { parentTaskId: number } = { sectionId: 3 }) => {
    let store!: Store
    function Grab() {
        const current = useTaskInsertStore()
        useEffect(() => { store = current }, [current])
        return null
    }
    render(
        <TaskInsertProvider>
            <Grab />
            <InsertTaskInput listKey="s3" afterTaskId={4} parent={parent} />
        </TaskInsertProvider>,
    )
    if (open) act(() => store.claim({ listKey: "s3", afterTaskId: 4 }))
    return () => store
}

describe("InsertTaskInput", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        prefs = { taskDensity: "normal", keepAddingTasks: false }
        ctx.insertTaskAfter.mockResolvedValue({ id: 50, index: 2 })
    })

    it("is shown only while its slot is open", () => {
        const getStore = setup(false)
        expect(screen.queryByPlaceholderText("Nuovo task…")).not.toBeInTheDocument()
        act(() => getStore().claim({ listKey: "s3", afterTaskId: 4 }))
        expect(screen.getByPlaceholderText("Nuovo task…")).toHaveFocus()
        act(() => getStore().claim({ listKey: "s3", afterTaskId: 8 }))
        expect(screen.queryByPlaceholderText("Nuovo task…")).not.toBeInTheDocument()
    })

    it("inserts after the given task at the returned index, records one undo step, dispatches the automation and closes", async () => {
        const user = userEvent.setup()
        const getStore = setup()
        await user.type(screen.getByPlaceholderText("Nuovo task…"), "  Mezzo  {Enter}")

        await waitFor(() => expect(ctx.appendTask).toHaveBeenCalledWith(50, { sectionId: 3 }, "Mezzo", 2))
        expect(ctx.insertTaskAfter).toHaveBeenCalledWith({ sectionId: 3 }, 4, "Mezzo")
        expect(recorder.create).toHaveBeenCalledTimes(1)
        expect(recorder.create).toHaveBeenCalledWith("task", 50, "Mezzo")
        expect(dispatch).toHaveBeenCalledWith({ type: "task.created", taskId: 50 })
        expect(getStore().getState()).toBeNull()
    })

    it("a subtask does not fire the task.created automation", async () => {
        const user = userEvent.setup()
        setup(true, { parentTaskId: 7 })
        await user.type(screen.getByPlaceholderText("Nuovo task…"), "Sub{Enter}")
        await waitFor(() => expect(ctx.appendTask).toHaveBeenCalledWith(50, { parentTaskId: 7 }, "Sub", 2))
        expect(dispatch).not.toHaveBeenCalled()
    })

    it("with keepAddingTasks the slot moves after the new task and the field is empty and focused", async () => {
        prefs = { taskDensity: "normal", keepAddingTasks: true }
        const user = userEvent.setup()
        const getStore = setup()
        await user.type(screen.getByPlaceholderText("Nuovo task…"), "Uno{Enter}")

        await waitFor(() => expect(getStore().getState()).toEqual({ listKey: "s3", afterTaskId: 50 }))
        // The field of the old slot is gone: the host mounts another at the new place
        expect(screen.queryByPlaceholderText("Nuovo task…")).not.toBeInTheDocument()
    })

    it("Esc discards the text and closes", async () => {
        const user = userEvent.setup()
        const getStore = setup()
        await user.type(screen.getByPlaceholderText("Nuovo task…"), "Perso{Escape}")
        expect(getStore().getState()).toBeNull()
        expect(ctx.insertTaskAfter).not.toHaveBeenCalled()
    })

    it("the X button closes", async () => {
        const user = userEvent.setup()
        const getStore = setup()
        await user.click(screen.getByRole("button", { name: "Chiudi" }))
        expect(getStore().getState()).toBeNull()
    })

    it("blur closes only when the field is empty", async () => {
        const user = userEvent.setup()
        const getStore = setup()
        const input = screen.getByPlaceholderText("Nuovo task…")
        await user.type(input, "Testo")
        fireEvent.blur(input)
        expect(getStore().getState()).not.toBeNull()

        await user.clear(input)
        fireEvent.blur(input)
        expect(getStore().getState()).toBeNull()
    })

    it("with keepAddingTasks Enter on the empty field closes it", async () => {
        prefs = { taskDensity: "normal", keepAddingTasks: true }
        const user = userEvent.setup()
        const getStore = setup()
        await user.type(screen.getByPlaceholderText("Nuovo task…"), "{Enter}")
        expect(getStore().getState()).toBeNull()
        expect(ctx.insertTaskAfter).not.toHaveBeenCalled()
    })

    it("reports an error and keeps the text and the field", async () => {
        ctx.insertTaskAfter.mockRejectedValue(new Error("boom"))
        const user = userEvent.setup()
        const getStore = setup()
        await user.type(screen.getByPlaceholderText("Nuovo task…"), "Ciao{Enter}")

        await waitFor(() => expect(toast.error).toHaveBeenCalled())
        expect(ctx.appendTask).not.toHaveBeenCalled()
        expect(recorder.create).not.toHaveBeenCalled()
        expect(screen.getByPlaceholderText("Nuovo task…")).toHaveValue("Ciao")
        expect(getStore().getState()).not.toBeNull()
    })
})

