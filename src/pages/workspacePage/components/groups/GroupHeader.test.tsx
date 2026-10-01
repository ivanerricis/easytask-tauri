import { render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GroupHeader } from "./GroupHeader"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"

const renameItem = vi.fn()
const patchGroup = vi.fn()
const rollback = vi.fn()

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("./ButtonMenuGroup", () => ({ ButtonMenuGroup: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ renameItem }),
}))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNoteActions: () => ({ patchGroup }),
}))
const prefs = { showSectionCount: true, showTaskCount: true, showGroupProgressBar: true }
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => prefs,
}))
const toggleOpen = vi.fn()
let isOpen = true
vi.mock("@/contexts/use-tabs", () => ({
    useGroupOpen: () => [isOpen, toggleOpen],
}))

beforeEach(() => {
    prefs.showGroupProgressBar = true
    isOpen = true
    toggleOpen.mockReset()
    renameItem.mockReset().mockResolvedValue(undefined)
    rollback.mockReset()
    patchGroup.mockReset().mockReturnValue(rollback)
})

describe("GroupHeader color", () => {
    it("tints the header with the color of the group and drops the neutral background", () => {
        const { container } = render(<GroupHeader group={makeGroup({ name: "G", color: "#ff0000" })} />)
        const header = container.firstElementChild as HTMLElement
        expect(header.style.backgroundColor).toBe("rgba(255, 0, 0, 0.4)")
        expect(header).not.toHaveClass("bg-background")
    })

    it("keeps the neutral background without a color", () => {
        const { container } = render(<GroupHeader group={makeGroup({ name: "G", color: null })} />)
        const header = container.firstElementChild as HTMLElement
        expect(header.style.backgroundColor).toBe("")
        expect(header).toHaveClass("bg-background")
    })
})

describe("GroupHeader name", () => {
    it("keeps the name on a single line, truncated, with the full name as tooltip", () => {
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} index={2} />)
        const name = screen.getByText("Da fare")
        expect(name).toHaveClass("truncate")
        expect(name).not.toHaveClass("break-words")
        expect(name).toHaveAttribute("title", "Da fare")
        expect(name).not.toHaveClass("text-muted-foreground")
    })

    it("keeps the name, the progress and the counters on the same row", () => {
        const { container } = render(<GroupHeader group={makeGroup({ name: "Da fare" })} index={0} />)
        const header = container.querySelector(".group.flex") as HTMLElement
        expect(header).toHaveClass("flex")
        expect(header).not.toHaveClass("flex-wrap")
        expect(header).not.toHaveClass("grid")
    })

    it("shows a muted placeholder 'Gruppo N' when unnamed", () => {
        render(<GroupHeader group={makeGroup({ name: null })} index={2} />)
        const label = screen.getByText("Gruppo 3")
        expect(label).toHaveClass("text-muted-foreground")
        expect(label).not.toHaveAttribute("title")
    })

    it("renames inline on Enter and patches the note without reloading it", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: null })} index={0} />)
        await user.click(screen.getByText("Gruppo 1"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "Idee{Enter}")
        expect(patchGroup).toHaveBeenCalledWith(7, { name: "Idee" })
        expect(renameItem).toHaveBeenCalledWith("section_group", 7, "Idee")
        expect(rollback).not.toHaveBeenCalled()
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

    it("rolls the optimistic name back and shows a toast when the write fails", async () => {
        const user = userEvent.setup()
        renameItem.mockRejectedValue(new Error("boom"))
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "B{Enter}")
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Impossibile cambiare il nome del gruppo"))
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
        expect(patchGroup).toHaveBeenCalledWith(7, { name: null })
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

describe("GroupHeader progress and collapse", () => {
    const withTasks = makeGroup({
        sections: [makeSection({ tasks: [makeTask({ completed: true }), makeTask({ id: 2 })] })],
    })

    it("shows the progress bar with the percentage", () => {
        render(<GroupHeader group={withTasks} />)
        expect(screen.getByText("50 %")).toBeInTheDocument()
    })

    it("hides the bar when the preference is off or the group has no tasks", () => {
        prefs.showGroupProgressBar = false
        const { unmount } = render(<GroupHeader group={withTasks} />)
        expect(screen.queryByText("50 %")).not.toBeInTheDocument()
        unmount()
        prefs.showGroupProgressBar = true
        render(<GroupHeader group={makeGroup()} />)
        expect(screen.queryByText(/ %$/)).not.toBeInTheDocument()
    })

    it("toggles the collapse state from the chevron", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={withTasks} />)
        await user.click(screen.getByLabelText("Compatta gruppo"))
        expect(toggleOpen).toHaveBeenCalled()
    })

    it("labels the chevron 'Espandi gruppo' when collapsed", () => {
        isOpen = false
        render(<GroupHeader group={withTasks} />)
        expect(screen.getByLabelText("Espandi gruppo")).toBeInTheDocument()
    })
})

describe("GroupHeader drag handle", () => {
    it("renders the grip only when a drag handle is given and forwards its props", () => {
        const { rerender } = render(<GroupHeader group={makeGroup()} />)
        expect(document.querySelector("[data-drag-handle]")).toBeNull()
        const ref = vi.fn()
        rerender(<GroupHeader group={makeGroup()} dragHandleRef={ref} dragHandleProps={{ "data-drag-handle": "" } as never} />)
        expect(document.querySelector("[data-drag-handle]")).not.toBeNull()
        expect(ref).toHaveBeenCalled()
    })
})
