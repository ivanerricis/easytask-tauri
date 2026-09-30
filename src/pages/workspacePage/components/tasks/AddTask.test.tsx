import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddTask } from "./AddTask"
import { toast } from "sonner"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const ctx = {
    createTask: vi.fn(),
    createSubTask: vi.fn(),
    refreshActiveNote: vi.fn(),
}
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceActions: () => ctx }))
vi.mock("@/contexts/active-note-context", () => ({ useActiveNoteActions: () => ctx }))

const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button"))
    return screen.getByPlaceholderText("Scrivi qualcosa...")
}

describe("AddTask", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.createTask.mockResolvedValue(undefined)
        ctx.createSubTask.mockResolvedValue(undefined)
        ctx.refreshActiveNote.mockResolvedValue(undefined)
    })

    it("starts collapsed and opens the input on click", async () => {
        const user = userEvent.setup()
        render(<AddTask sectionId={3} />)
        expect(screen.queryByPlaceholderText("Scrivi qualcosa...")).not.toBeInTheDocument()

        await open(user)
        expect(screen.getByPlaceholderText("Scrivi qualcosa...")).toHaveFocus()
    })

    it("creates the trimmed task, refreshes the note and collapses", async () => {
        const user = userEvent.setup()
        render(<AddTask sectionId={3} />)
        const input = await open(user)

        await user.type(input, "  Buy milk  {Enter}")

        await waitFor(() => expect(ctx.refreshActiveNote).toHaveBeenCalled())
        expect(ctx.createTask).toHaveBeenCalledWith(3, "Buy milk")
        expect(screen.queryByPlaceholderText("Scrivi qualcosa...")).not.toBeInTheDocument()
    })

    it("does not create a task for an empty or blank name", async () => {
        const user = userEvent.setup()
        render(<AddTask sectionId={3} />)
        const input = await open(user)

        const submit = screen.getAllByRole("button").find(b => b.getAttribute("type") === "submit")!
        expect(submit).toBeDisabled()

        await user.type(input, "   {Enter}")
        expect(ctx.createTask).not.toHaveBeenCalled()
    })

    it("reports creation errors with a toast and keeps the form open", async () => {
        const user = userEvent.setup()
        ctx.createTask.mockRejectedValue(new Error("duplicate"))
        render(<AddTask sectionId={3} />)
        await user.type(await open(user), "Task{Enter}")

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("duplicate"))
        expect(screen.getByPlaceholderText("Scrivi qualcosa...")).toBeInTheDocument()
        expect(ctx.refreshActiveNote).not.toHaveBeenCalled()
    })

    it("closes and clears the text on outside mousedown", async () => {
        const user = userEvent.setup()
        render(<AddTask sectionId={3} />)
        await user.type(await open(user), "draft")

        fireEvent.mouseDown(document.body)
        expect(screen.queryByPlaceholderText("Scrivi qualcosa...")).not.toBeInTheDocument()

        // Reopening shows an empty input
        expect(await open(user)).toHaveValue("")
    })

    it("closes with the X button without creating", async () => {
        const user = userEvent.setup()
        render(<AddTask sectionId={3} />)
        await open(user)
        const close = screen.getAllByRole("button").find(b => b.getAttribute("type") === "button")!
        await user.click(close)

        expect(screen.queryByPlaceholderText("Scrivi qualcosa...")).not.toBeInTheDocument()
        expect(ctx.createTask).not.toHaveBeenCalled()
    })

    describe("subtask mode", () => {
        const placeholder = "Scrivi un sottotask..."

        it("starts open and focused, and creates a subtask instead of a task", async () => {
            const user = userEvent.setup()
            render(<AddTask sectionId={3} parentTaskId={7} />)
            const input = screen.getByPlaceholderText(placeholder)
            expect(input).toHaveFocus()

            await user.type(input, "  Step one  {Enter}")

            await waitFor(() => expect(ctx.refreshActiveNote).toHaveBeenCalled())
            expect(ctx.createSubTask).toHaveBeenCalledWith(7, "Step one")
            expect(ctx.createTask).not.toHaveBeenCalled()
        })

        it("keeps the input open and empty to add the next subtask", async () => {
            const user = userEvent.setup()
            const onClose = vi.fn()
            render(<AddTask sectionId={3} parentTaskId={7} onClose={onClose} />)
            await user.type(screen.getByPlaceholderText(placeholder), "One{Enter}")
            await waitFor(() => expect(ctx.refreshActiveNote).toHaveBeenCalled())

            const input = screen.getByPlaceholderText(placeholder)
            expect(input).toHaveValue("")
            await user.type(input, "Two{Enter}")
            await waitFor(() => expect(ctx.createSubTask).toHaveBeenLastCalledWith(7, "Two"))
            expect(onClose).not.toHaveBeenCalled()
        })

        it("closes on Escape", async () => {
            const user = userEvent.setup()
            const onClose = vi.fn()
            render(<AddTask sectionId={3} parentTaskId={7} onClose={onClose} />)
            await user.type(screen.getByPlaceholderText(placeholder), "draft{Escape}")
            expect(onClose).toHaveBeenCalledTimes(1)
            expect(ctx.createSubTask).not.toHaveBeenCalled()
        })

        it("closes on blur when empty but not when it holds text", async () => {
            const user = userEvent.setup()
            const onClose = vi.fn()
            render(<AddTask sectionId={3} parentTaskId={7} onClose={onClose} />)
            const input = screen.getByPlaceholderText(placeholder)
            await user.type(input, "keep")
            input.blur()
            expect(onClose).not.toHaveBeenCalled()

            await user.clear(input)
            input.blur()
            expect(onClose).toHaveBeenCalledTimes(1)
        })

        it("reports errors with a toast", async () => {
            const user = userEvent.setup()
            ctx.createSubTask.mockRejectedValue(new Error("boom"))
            render(<AddTask sectionId={3} parentTaskId={7} />)
            await user.type(screen.getByPlaceholderText(placeholder), "x{Enter}")
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"))
            expect(ctx.refreshActiveNote).not.toHaveBeenCalled()
        })
    })
})
