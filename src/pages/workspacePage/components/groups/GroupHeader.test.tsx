import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GroupHeader } from "./GroupHeader"
import { PreferencesContext, type PreferencesContextType } from "@/contexts/preferences-context-object"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"

// Radix tooltips measure their arrow with a ResizeObserver, which jsdom lacks
vi.stubGlobal("ResizeObserver", class { observe() { } unobserve() { } disconnect() { } })

const renameItem = vi.fn()
const patchGroup = vi.fn()
const rollback = vi.fn()

vi.mock("./ButtonMenuGroup", () => ({ ButtonMenuGroup: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ renameItem }),
}))
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNoteActions: () => ({ patchGroup }),
}))
const prefs = { showSectionCount: true, showTaskCount: true, showAudioFileCount: true, showGroupProgressBar: true, showUnnamedLabels: false, renameOnClick: true }
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
    prefs.showAudioFileCount = true
    prefs.showUnnamedLabels = false
    prefs.renameOnClick = true
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

    it("scales the tint by the color intensity preference", () => {
        const { container } = render(
            <PreferencesContext.Provider value={{ colorIntensity: 1.5 } as PreferencesContextType}>
                <GroupHeader group={makeGroup({ name: "G", color: "#ff0000" })} />
            </PreferencesContext.Provider>,
        )
        expect((container.firstElementChild as HTMLElement).style.backgroundColor).toBe("rgba(255, 0, 0, 0.6)")
    })

    it("keeps the neutral background without a color", () => {
        const { container } = render(<GroupHeader group={makeGroup({ name: "G", color: null })} />)
        const header = container.firstElementChild as HTMLElement
        expect(header.style.backgroundColor).toBe("")
        expect(header).toHaveClass("bg-background")
    })
})

describe("GroupHeader unnamed label and rename on click", () => {
    it("shows no text for an unnamed group by default", () => {
        render(<GroupHeader group={makeGroup({ name: null })} index={2} />)
        expect(screen.getByRole("button", { name: "Gruppo 3" })).toBeEmptyDOMElement()
    })

    it("shows the fallback label in muted text when the preference is on", () => {
        prefs.showUnnamedLabels = true
        render(<GroupHeader group={makeGroup({ name: null })} index={2} />)
        const name = screen.getByRole("button", { name: "Gruppo 3" })
        expect(name).toHaveTextContent("Gruppo 3")
        expect(name).toHaveClass("text-muted-foreground")
    })

    it("does not mute the label of a named group", () => {
        prefs.showUnnamedLabels = true
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} />)
        expect(screen.getByText("Da fare")).not.toHaveClass("text-muted-foreground")
    })

    it("does not start the rename on click when renameOnClick is off", async () => {
        prefs.renameOnClick = false
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} />)
        await userEvent.click(screen.getByText("Da fare"))
        expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("Enter on the name starts the rename even when renameOnClick is off", async () => {
        prefs.renameOnClick = false
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} />)
        screen.getByRole("button", { name: "Da fare" }).focus()
        await user.keyboard("{Enter}")
        expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("starts the rename on click by default", async () => {
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} />)
        await userEvent.click(screen.getByText("Da fare"))
        expect(screen.getByRole("textbox")).toBeInTheDocument()
    })
})

describe("GroupHeader name", () => {
    it("keeps the name on a single line and truncates a long one (full name as title)", () => {
        render(<GroupHeader group={makeGroup({ name: "Da fare" })} index={2} />)
        const name = screen.getByText("Da fare")
        expect(name).toHaveClass("truncate", "min-w-0")
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

    it("shows no text when unnamed: the empty button keeps its width and is named 'Gruppo N' for the screen readers", () => {
        render(<GroupHeader group={makeGroup({ name: null })} index={2} />)
        const button = screen.getByRole("button", { name: "Gruppo 3" })
        expect(button).toBeEmptyDOMElement()
        expect(button).toHaveClass("flex-1")
        expect(button).not.toHaveAttribute("title")
    })

    it("renames inline on Enter and patches the note without reloading it", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: null })} index={0} />)
        await user.click(screen.getByRole("button", { name: "Gruppo 1" }))
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

    it("rolls the optimistic name back and shows the error inline when the write fails", async () => {
        const user = userEvent.setup()
        renameItem.mockRejectedValue(new Error("boom"))
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "B{Enter}")
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(await screen.findByRole("alert")).toHaveTextContent("Impossibile cambiare il nome del gruppo")
        // The field stays open with the typed text
        expect(screen.getByLabelText("Nome del gruppo")).toHaveValue("AB")
        expect(screen.getByLabelText("Nome del gruppo")).toBeInvalid()
    })

    it("cancels on Escape without saving", async () => {
        const user = userEvent.setup()
        render(<GroupHeader group={makeGroup({ id: 7, name: "A" })} />)
        await user.click(screen.getByText("A"))
        await user.type(screen.getByLabelText("Nome del gruppo"), "B{Escape}")
        await user.click(document.body)
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
        await user.click(screen.getByLabelText("Comprimi gruppo"))
        expect(toggleOpen).toHaveBeenCalled()
    })

    it("labels the chevron 'Espandi gruppo' when collapsed", () => {
        isOpen = false
        render(<GroupHeader group={withTasks} />)
        expect(screen.getByLabelText("Espandi gruppo")).toBeInTheDocument()
    })
})

describe("GroupHeader drag", () => {
    it("puts the drag props on the whole header, only when they are given", () => {
        const { rerender } = render(<GroupHeader group={makeGroup()} />)
        expect(document.querySelector("[data-drag-handle]")).toBeNull()
        rerender(<GroupHeader group={makeGroup()} dragProps={{ "data-drag-handle": "" } as never} />)
        const header = document.querySelector("[data-drag-handle]")!
        expect(header).not.toBeNull()
        // The header holds the chevron and the name: it is the drag area, not a separate grip
        expect(header).toContainElement(screen.getByLabelText("Comprimi gruppo"))
    })
})

describe("GroupHeader audio file count", () => {
    const badge = (container: HTMLElement) => container.querySelector("svg.lucide-file-audio")

    it("shows the number of audio files", () => {
        const { container } = render(<GroupHeader group={makeGroup({ name: "G" })} audioCount={3} />)
        expect(badge(container)).toBeInTheDocument()
        expect(badge(container)?.parentElement).toHaveTextContent("3")
    })

    it("is hidden when the group has no audio files", () => {
        const { container } = render(<GroupHeader group={makeGroup({ name: "G" })} audioCount={0} />)
        expect(badge(container)).not.toBeInTheDocument()
    })

    it("is hidden when the preference is off", () => {
        prefs.showAudioFileCount = false
        const { container } = render(<GroupHeader group={makeGroup({ name: "G" })} audioCount={3} />)
        expect(badge(container)).not.toBeInTheDocument()
    })
})
