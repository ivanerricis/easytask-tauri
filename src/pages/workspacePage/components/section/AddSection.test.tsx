import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { AddSection } from "./AddSection"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const ctx = {
    createGroup: vi.fn(),
    createSectionInGroup: vi.fn(),
    refreshActiveNote: vi.fn(),
    activeId: null as number | null,
}
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceActions: () => ctx }))
vi.mock("@/contexts/tabs-context", () => ({ useActiveNoteId: () => ctx.activeId }))
vi.mock("@/contexts/active-note-context", () => ({ useActiveNoteActions: () => ctx }))

const GROUP_PLACEHOLDER = "Nome del gruppo (facoltativo)..."
const SECTION_PLACEHOLDER = "Titolo della sezione..."

const openGroupForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /Nuovo gruppo/ }))
    return screen.getByPlaceholderText(GROUP_PLACEHOLDER)
}

const openSectionForm = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /Nuova sezione/ }))
    return screen.getByPlaceholderText(SECTION_PLACEHOLDER)
}

describe("AddSection", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.createGroup.mockResolvedValue(undefined)
        ctx.createSectionInGroup.mockResolvedValue(undefined)
        ctx.refreshActiveNote.mockResolvedValue(undefined)
        ctx.activeId = 20
    })

    it("outside a group creates a named group, not a section", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openGroupForm(user), "  Sprint  {Enter}")

        await waitFor(() => expect(ctx.refreshActiveNote).toHaveBeenCalled())
        expect(ctx.createGroup).toHaveBeenCalledWith(20, "Sprint")
        expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
        expect(screen.queryByPlaceholderText(GROUP_PLACEHOLDER)).not.toBeInTheDocument()
    })

    it("creates an unnamed group when the name is empty", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openGroupForm(user), "   {Enter}")

        await waitFor(() => expect(ctx.createGroup).toHaveBeenCalledWith(20, ""))
    })

    it("creates the section inside a group", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup groupId={7} />)
        await user.type(await openSectionForm(user), "Inner{Enter}")

        await waitFor(() => expect(ctx.createSectionInGroup).toHaveBeenCalledWith(7, "Inner"))
        expect(ctx.createGroup).not.toHaveBeenCalled()
    })

    it("ignores an empty section title", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup groupId={7} />)
        await user.type(await openSectionForm(user), "   {Enter}")

        expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
    })

    it("shows a toast when inGroup is set without a groupId", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup />)
        await user.type(await openSectionForm(user), "Inner{Enter}")

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ID gruppo mancante"))
        expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
    })

    it("does nothing without a current note", async () => {
        const user = userEvent.setup()
        ctx.activeId = null
        render(<AddSection />)
        await user.type(await openGroupForm(user), "X{Enter}")

        expect(ctx.createGroup).not.toHaveBeenCalled()
        expect(screen.getByPlaceholderText(GROUP_PLACEHOLDER)).toBeInTheDocument()
    })

    it("reports creation errors with a toast and keeps the form open", async () => {
        const user = userEvent.setup()
        ctx.createGroup.mockRejectedValue(new Error("insert failed"))
        render(<AddSection />)
        await user.type(await openGroupForm(user), "X{Enter}")

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("insert failed"))
        expect(ctx.refreshActiveNote).not.toHaveBeenCalled()
        expect(screen.getByPlaceholderText(GROUP_PLACEHOLDER)).toBeInTheDocument()
    })

    it("closes on outside click and clears the typed name", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openGroupForm(user), "draft")

        fireEvent.mouseDown(document.body)
        expect(screen.queryByPlaceholderText(GROUP_PLACEHOLDER)).not.toBeInTheDocument()
        expect(await openGroupForm(user)).toHaveValue("")
    })

    it("toggles with Alt+N only when not inside a group", async () => {
        const { unmount } = render(<AddSection />)
        fireEvent.keyDown(document, { key: "n", altKey: true })
        expect(await screen.findByPlaceholderText(GROUP_PLACEHOLDER)).toBeInTheDocument()
        unmount()

        render(<AddSection inGroup groupId={1} />)
        fireEvent.keyDown(document, { key: "n", altKey: true })
        expect(screen.queryByPlaceholderText(SECTION_PLACEHOLDER)).not.toBeInTheDocument()
    })
})
