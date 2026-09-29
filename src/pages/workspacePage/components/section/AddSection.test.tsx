import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { AddSection } from "./AddSection"
import { makeGroup, makeNote } from "@/test/ui-fixtures"

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const ctx = {
    createSection: vi.fn(),
    createSectionInGroup: vi.fn(),
    getNoteData: vi.fn(),
    currentNote: null as ReturnType<typeof makeNote> | null,
    groups: [] as ReturnType<typeof makeGroup>[],
}
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceData: () => ctx,
}))

const PLACEHOLDER = "Scrivi qualcosa..."

const openForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /Nuova sezione/ }))
    return screen.getByPlaceholderText(PLACEHOLDER)
}

describe("AddSection", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.createSection.mockResolvedValue(undefined)
        ctx.createSectionInGroup.mockResolvedValue(undefined)
        ctx.getNoteData.mockResolvedValue(undefined)
        ctx.currentNote = makeNote({ id: 20 })
        ctx.groups = []
    })

    it("creates a section at position 0 when there are no groups", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openForm(user), "  Todo  {Enter}")

        await waitFor(() => expect(ctx.getNoteData).toHaveBeenCalledWith(20))
        expect(ctx.createSection).toHaveBeenCalledWith(20, "Todo", 0)
        expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument()
    })

    it("places the new section after the last group", async () => {
        const user = userEvent.setup()
        ctx.groups = [makeGroup({ id: 1, position: 0 }), makeGroup({ id: 2, position: 4 })]
        render(<AddSection />)
        await user.type(await openForm(user), "Next{Enter}")

        await waitFor(() => expect(ctx.createSection).toHaveBeenCalledWith(20, "Next", 5))
    })

    it("creates the section inside a group", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup groupId={7} />)
        await user.type(await openForm(user), "Inner{Enter}")

        await waitFor(() => expect(ctx.createSectionInGroup).toHaveBeenCalledWith(7, "Inner"))
        expect(ctx.createSection).not.toHaveBeenCalled()
    })

    it("shows a toast when inGroup is set without a groupId", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup />)
        await user.type(await openForm(user), "Inner{Enter}")

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ID gruppo mancante"))
        expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
    })

    it("ignores an empty name", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openForm(user), "   {Enter}")

        expect(ctx.createSection).not.toHaveBeenCalled()
    })

    it("does nothing without a current note", async () => {
        const user = userEvent.setup()
        ctx.currentNote = null
        render(<AddSection />)
        await user.type(await openForm(user), "X{Enter}")

        expect(ctx.createSection).not.toHaveBeenCalled()
        expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
    })

    it("reports creation errors with a toast and keeps the form open", async () => {
        const user = userEvent.setup()
        ctx.createSection.mockRejectedValue(new Error("insert failed"))
        render(<AddSection />)
        await user.type(await openForm(user), "X{Enter}")

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("insert failed"))
        expect(ctx.getNoteData).not.toHaveBeenCalled()
        expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
    })

    it("closes on outside click and clears the typed name", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openForm(user), "draft")

        fireEvent.mouseDown(document.body)
        expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument()
        expect(await openForm(user)).toHaveValue("")
    })

    it("toggles with Alt+N only when not inside a group", async () => {
        const { unmount } = render(<AddSection />)
        fireEvent.keyDown(document, { key: "n", altKey: true })
        expect(await screen.findByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()
        unmount()

        render(<AddSection inGroup groupId={1} />)
        fireEvent.keyDown(document, { key: "n", altKey: true })
        expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument()
    })
})
