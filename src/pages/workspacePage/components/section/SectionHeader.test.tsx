import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SectionHeader } from "./SectionHeader"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { searchingStore } from "@/test/search-store"
import { NoteSearchContext } from "../note-search-context"

vi.mock("./ButtonMenuSection", () => ({ ButtonMenuSection: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
const renameItem = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ renameItem }) }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ patchSection: vi.fn() }) }))
const prefs = { showProgressBar: true, showUnnamedLabels: false, renameOnClick: true }
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))

describe("SectionHeader keyboard", () => {
    beforeEach(() => {
        renameItem.mockReset(); renameItem.mockResolvedValue(undefined)
        prefs.showUnnamedLabels = false
        prefs.renameOnClick = true
    })

    it("toggles the section with Enter and Space on the chevron button", async () => {
        const onOpenChange = vi.fn()
        render(<SectionHeader isOpen onOpenChange={onOpenChange} section={makeSection({ tasks: [makeTask()] })} />)
        const chevron = screen.getByRole("button", { name: "Comprimi sezione" })
        chevron.focus()
        await userEvent.keyboard("{Enter}")
        await userEvent.keyboard(" ")
        expect(onOpenChange).toHaveBeenCalledTimes(2)
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it("starts editing the title with Enter", async () => {
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        screen.getByRole("button", { name: "Titolo" }).focus()
        await userEvent.keyboard("{Enter}")
        expect(screen.getByRole("textbox")).toHaveValue("Titolo")
    })

    it("Escape cancels the title edit: no rename, and the blur that follows does not save it", async () => {
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        await user.click(screen.getByRole("button", { name: "Titolo" }))
        await user.type(screen.getByRole("textbox"), "X{Escape}")
        await user.click(document.body)

        expect(renameItem).not.toHaveBeenCalled()
        expect(screen.queryByRole("textbox")).toBeNull()
        expect(screen.getByRole("button", { name: "Titolo" })).toBeInTheDocument()
    })

    it("shows the progress bar only when the section has tasks", () => {
        const { rerender } = render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ tasks: [] })} />)
        expect(screen.queryByRole("progressbar")).toBeNull()
        expect(screen.queryByText("100 %")).toBeNull()

        rerender(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ tasks: [makeTask()] })} />)
        expect(screen.getByRole("progressbar")).toBeInTheDocument()
        expect(screen.getByText("0 %")).toBeInTheDocument()
    })

    it("shows no text for an untitled section by default and the fallback label when the preference is on", () => {
        const { rerender } = render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "" })} />)
        expect(screen.getByRole("button", { name: "Sezione senza titolo" })).toBeEmptyDOMElement()

        prefs.showUnnamedLabels = true
        rerender(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "" })} />)
        const name = screen.getByRole("button", { name: "Sezione senza titolo" })
        expect(name).toHaveTextContent("Sezione senza titolo")
        expect(name).toHaveClass("text-muted-foreground")
    })

    it("does not start the rename on click when renameOnClick is off", async () => {
        prefs.renameOnClick = false
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        await userEvent.click(screen.getByRole("button", { name: "Titolo" }))
        expect(screen.queryByRole("textbox")).toBeNull()
    })

    it("Enter on the title starts the rename even when renameOnClick is off", async () => {
        prefs.renameOnClick = false
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        screen.getByRole("button", { name: "Titolo" }).focus()
        await user.keyboard("{Enter}")
        expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("Enter saves once", async () => {
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        await user.click(screen.getByRole("button", { name: "Titolo" }))
        await user.type(screen.getByRole("textbox"), "X{Enter}")

        expect(renameItem).toHaveBeenCalledTimes(1)
    })
})

describe("SectionHeader search", () => {
    const section = makeSection({ id: 7, title: "Da comprare" })
    const group = makeGroup({ id: 1, sections: [section] })

    it("renders no marks when nothing is searched", () => {
        const { container } = render(<SectionHeader isOpen onOpenChange={vi.fn()} section={section} />)
        expect(container.querySelector("mark")).toBeNull()
    })

    it("marks the matches of the title, ignoring case", () => {
        const { container } = render(
            <NoteSearchContext.Provider value={searchingStore([group], "a")}><SectionHeader isOpen onOpenChange={vi.fn()} section={section} /></NoteSearchContext.Provider>,
        )
        const marks = [...container.querySelectorAll("mark")]
        expect(marks.map(mark => mark.textContent)).toEqual(["a", "a"])
        expect(marks[0]).toHaveAttribute("data-active", "true")
        expect(marks[1]).not.toHaveAttribute("data-active")
        expect(screen.getByRole("button", { name: "Da comprare" })).toHaveTextContent("Da comprare")
    })
})
