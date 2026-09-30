import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GroupHeader } from "./GroupHeader"
import { makeGroup } from "@/test/ui-fixtures"

const renameItem = vi.fn()
const refreshActiveNote = vi.fn()

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("./ButtonMenuGroup", () => ({ ButtonMenuGroup: () => null }))
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceActions: () => ({ renameItem }),
}))
vi.mock("@/contexts/active-note-context", () => ({
    useActiveNoteActions: () => ({ refreshActiveNote }),
}))
vi.mock("@/contexts/preferences-context", () => ({
    usePreferences: () => ({ showSectionCount: true, showTaskCount: true }),
}))

beforeEach(() => {
    renameItem.mockReset().mockResolvedValue(undefined)
    refreshActiveNote.mockReset().mockResolvedValue(undefined)
})

describe("GroupHeader name", () => {
    it("shows the name with the full name as tooltip", () => {
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} index={2} />)
        const name = screen.getByText("Da fare")
        expect(name).toHaveAttribute("title", "Da fare")
        expect(name).not.toHaveClass("text-muted-foreground")
    })

    it("shows a muted placeholder 'Gruppo N' when unnamed", () => {
        render(<GroupHeader group={makeGroup({ name: null })} index={2} />)
        const label = screen.getByText("Gruppo 3")
        expect(label).toHaveClass("text-muted-foreground")
        expect(label).not.toHaveAttribute("title")
    })

    it("renames inline on Enter and reloads the note", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: null })} index={0} />)
        await user.click(screen.getByText("Gruppo 1"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "Idee{Enter}")
        expect(renameItem).toHaveBeenCalledWith("section_group", 7, "Idee")
        expect(refreshActiveNote).toHaveBeenCalled()
        expect(screen.queryByLabelText("Nome del gruppo")).not.toBeInTheDocument()
    })

    it("saves on blur", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "B")
        await user.tab()
        expect(renameItem).toHaveBeenCalledWith("section_group", 7, "AB")
    })

    it("cancels on Escape without saving", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "B{Escape}")
        expect(renameItem).not.toHaveBeenCalled()
        expect(screen.getByText("A")).toBeInTheDocument()
    })

    it("clears the name when the text is emptied", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.clear(screen.getByLabelText("Nome del gruppo"))
        await user.keyboard("{Enter}")
        expect(renameItem).toHaveBeenCalledWith("section_group", 7, "")
    })

    it("does not save an unchanged name", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.keyboard("{Enter}")
        expect(renameItem).not.toHaveBeenCalled()
    })
})
