import type { ReactElement } from "react"
import { act, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { AddSection } from "./AddSection"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { deferred } from "@/test/ui-render"
import { requestAppCommand } from "@/lib/app-commands"

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ShortcutsProvider })

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const ctx = {
    createGroup: vi.fn(),
    createSectionInGroup: vi.fn(),
    appendGroup: vi.fn(),
    appendSection: vi.fn(),
    activeId: null as number | null,
}
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ctx }))
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteId: () => ctx.activeId }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ctx }))

const GROUP_PLACEHOLDER = "Nome del gruppo…"
const SECTION_PLACEHOLDER = "Titolo della sezione…"

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
        ctx.createGroup.mockResolvedValue({ groupId: 31, defaultSectionId: 32 })
        ctx.createSectionInGroup.mockResolvedValue(41)
        ctx.activeId = 20
    })

    it("outside a group creates a named group, not a section", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openGroupForm(user), "  Sprint  {Enter}")

        await waitFor(() => expect(ctx.appendGroup).toHaveBeenCalledWith(31, 20, "Sprint", 32))
        expect(ctx.createGroup).toHaveBeenCalledWith(20, "Sprint")
        expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
        expect(screen.queryByPlaceholderText(GROUP_PLACEHOLDER)).not.toBeInTheDocument()
    })

    it("creates the group once when Enter is pressed twice while saving", async () => {
        const user = userEvent.setup()
        const pending = deferred<number>()
        ctx.createGroup.mockReturnValue(pending.promise)
        render(<AddSection />)
        await user.type(await openGroupForm(user), "Sprint{Enter}{Enter}")

        expect(ctx.createGroup).toHaveBeenCalledTimes(1)
        pending.resolve(31)
        await waitFor(() => expect(ctx.appendGroup).toHaveBeenCalledTimes(1))
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
        expect(ctx.appendSection).toHaveBeenCalledWith(41, 7, "Inner")
        expect(ctx.createGroup).not.toHaveBeenCalled()
    })

    it("creates an untitled section when the title is empty", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup groupId={7} />)
        await user.type(await openSectionForm(user), "   {Enter}")

        await waitFor(() => expect(ctx.createSectionInGroup).toHaveBeenCalledWith(7, ""))
    })

    it("has no add or cancel buttons: Enter creates and Escape closes", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup groupId={7} />)
        const input = await openSectionForm(user)
        expect(screen.queryByRole("button", { name: "Aggiungi" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Annulla" })).not.toBeInTheDocument()
        await user.type(input, "Bozza{Escape}")
        expect(screen.queryByPlaceholderText(SECTION_PLACEHOLDER)).not.toBeInTheDocument()
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
        expect(ctx.appendGroup).not.toHaveBeenCalled()
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

    it("closes the group form on Escape, discarding the name, without creating", async () => {
        const user = userEvent.setup()
        render(<AddSection />)
        await user.type(await openGroupForm(user), "draft{Escape}")

        expect(screen.queryByPlaceholderText(GROUP_PLACEHOLDER)).not.toBeInTheDocument()
        expect(ctx.createGroup).not.toHaveBeenCalled()
        expect(await openGroupForm(user)).toHaveValue("")
    })

    it("closes the section form on Escape, discarding the title, without creating", async () => {
        const user = userEvent.setup()
        render(<AddSection inGroup groupId={5} />)
        await user.type(await openSectionForm(user), "draft{Escape}")

        expect(screen.queryByPlaceholderText(SECTION_PLACEHOLDER)).not.toBeInTheDocument()
        expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
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

    it("opens the form and scrolls it into view when asked by the new group command", async () => {
        const scrollIntoView = vi.fn()
        Element.prototype.scrollIntoView = scrollIntoView
        render(<AddSection />)
        act(() => requestAppCommand("new-group"))

        expect(await screen.findByPlaceholderText(GROUP_PLACEHOLDER)).toBeInTheDocument()
        expect(scrollIntoView).toHaveBeenCalledWith({ inline: "end", block: "nearest" })
    })

    it("does not scroll when the form is opened with the button", async () => {
        const scrollIntoView = vi.fn()
        Element.prototype.scrollIntoView = scrollIntoView
        render(<AddSection />)
        await openGroupForm(userEvent.setup())
        expect(scrollIntoView).not.toHaveBeenCalled()
    })

    describe("controlled by the group", () => {
        it("renders nothing while closed: there is no section button", () => {
            render(<AddSection inGroup groupId={7} open={false} onClose={vi.fn()} />)
            expect(screen.queryByRole("button")).not.toBeInTheDocument()
            expect(screen.queryByPlaceholderText(SECTION_PLACEHOLDER)).not.toBeInTheDocument()
        })

        it("shows the focused form when open and scrolls it into view", () => {
            const scrollIntoView = vi.fn()
            Element.prototype.scrollIntoView = scrollIntoView
            render(<AddSection inGroup groupId={7} open onClose={vi.fn()} />)
            expect(screen.getByPlaceholderText(SECTION_PLACEHOLDER)).toHaveFocus()
            expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
        })

        it("creates the section and asks to close", async () => {
            const user = userEvent.setup()
            const onClose = vi.fn()
            render(<AddSection inGroup groupId={7} open onClose={onClose} />)
            await user.type(screen.getByPlaceholderText(SECTION_PLACEHOLDER), "Inner{Enter}")

            await waitFor(() => expect(ctx.createSectionInGroup).toHaveBeenCalledWith(7, "Inner"))
            expect(ctx.appendSection).toHaveBeenCalledWith(41, 7, "Inner")
            await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
        })

        it("asks to close on Escape and on a click outside, without creating", async () => {
            const user = userEvent.setup()
            const onClose = vi.fn()
            render(<AddSection inGroup groupId={7} open onClose={onClose} />)
            await user.type(screen.getByPlaceholderText(SECTION_PLACEHOLDER), "x{Escape}")
            expect(onClose).toHaveBeenCalledTimes(1)

            fireEvent.mouseDown(document.body)
            expect(onClose).toHaveBeenCalledTimes(2)
            expect(ctx.createSectionInGroup).not.toHaveBeenCalled()
        })

        it("ignores a click outside while closed", () => {
            const onClose = vi.fn()
            render(<AddSection inGroup groupId={7} open={false} onClose={onClose} />)
            fireEvent.mouseDown(document.body)
            expect(onClose).not.toHaveBeenCalled()
        })
    })
})
