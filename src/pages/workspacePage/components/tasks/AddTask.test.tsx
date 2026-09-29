import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddTask } from "./AddTask"
import { makeNote } from "@/test/ui-fixtures"

const ctx = {
    createTask: vi.fn(),
    getNoteData: vi.fn(),
    currentNote: null as ReturnType<typeof makeNote> | null,
}
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceData: () => ctx,
}))

const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button"))
    return screen.getByPlaceholderText("Scrivi qualcosa...")
}

describe("AddTask", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.createTask.mockResolvedValue(undefined)
        ctx.getNoteData.mockResolvedValue(undefined)
        ctx.currentNote = makeNote({ id: 12 })
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

        await waitFor(() => expect(ctx.getNoteData).toHaveBeenCalledWith(12))
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

    it("does not refresh the note when there is no current note", async () => {
        const user = userEvent.setup()
        ctx.currentNote = null
        render(<AddTask sectionId={3} />)
        await user.type(await open(user), "Task{Enter}")

        await waitFor(() => expect(ctx.createTask).toHaveBeenCalled())
        expect(ctx.getNoteData).not.toHaveBeenCalled()
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
})
