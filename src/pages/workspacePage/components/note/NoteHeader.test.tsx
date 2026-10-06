import { useEffect } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { TabsProvider } from "@/contexts/tabs-context"
import { useTabsActions } from "@/contexts/use-tabs"
import { makeNote } from "@/test/ui-fixtures"
import { NoteHeader } from "./NoteHeader"

const prefs = { hideCompletedTasks: false, setHideCompletedTasks: vi.fn() }
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("@/lib/store/preferences", () => ({ getReopenNotes: vi.fn().mockResolvedValue(false) }))
vi.mock("@/lib/store/tabs", () => ({ getWorkspaceTabs: vi.fn(), saveWorkspaceTabs: vi.fn() }))
vi.mock("./ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
// Radix tooltips measure their arrow with a ResizeObserver, which jsdom lacks
vi.stubGlobal("ResizeObserver", class { observe() { } unobserve() { } disconnect() { } })

const notes = [makeNote({ id: 1, name: "Uno" }), makeNote({ id: 2, name: "Due" })]

const Opener = () => {
    const { openNote } = useTabsActions()
    useEffect(() => { openNote(1); openNote(2) }, [openNote])
    return null
}

const setup = () => render(
    <ShortcutsProvider>
        <TabsProvider notes={notes} workspaceId={null}>
            <Opener />
            {notes.map(note => <NoteHeader key={note.id} note={note} />)}
        </TabsProvider>
    </ShortcutsProvider>,
)

describe("NoteHeader hide completed toggle", () => {
    beforeEach(() => {
        prefs.hideCompletedTasks = false
        prefs.setHideCompletedTasks.mockReset()
    })

    it("shows a single toggle, on the active tab, reflecting the preference with aria-pressed", async () => {
        const { unmount } = setup()
        await act(async () => { })
        const button = screen.getByRole("button", { name: "Nascondi i task completati" })
        expect(button).toHaveAttribute("aria-pressed", "false")
        expect(screen.getAllByRole("button", { name: "Nascondi i task completati" })).toHaveLength(1)
        unmount()

        prefs.hideCompletedTasks = true
        setup()
        await act(async () => { })
        expect(screen.getByRole("button", { name: "Nascondi i task completati" })).toHaveAttribute("aria-pressed", "true")
    })

    it("toggles the preference on click without activating another tab", async () => {
        setup()
        await act(async () => { })
        await userEvent.click(screen.getByRole("button", { name: "Nascondi i task completati" }))
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledTimes(1)
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledWith(true)
    })

    it("toggles the preference once with Ctrl+Shift+H, whatever the number of open notes", async () => {
        setup()
        await act(async () => { })
        fireEvent.keyDown(window, { key: "H", ctrlKey: true, shiftKey: true })
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledTimes(1)
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledWith(true)
    })

    it("does not trigger with Ctrl+H alone (go home)", async () => {
        setup()
        await act(async () => { })
        fireEvent.keyDown(window, { key: "h", ctrlKey: true })
        expect(prefs.setHideCompletedTasks).not.toHaveBeenCalled()
    })
})

describe("NoteHeader active tab", () => {
    // Both tabs reserve the same border, so activating one never moves the others
    const tab = (name: string) => screen.getByText(name).closest("[role='button']") as HTMLElement

    it("marks the active tab with a primary border, bold text and aria-current", async () => {
        setup()
        await act(async () => { })

        // Opened last, "Due" is the active one
        expect(tab("Due")).toHaveAttribute("aria-current", "true")
        expect(tab("Due").className).toContain("border-x-primary")
        // no line under the active tab: it opens onto the note
        expect(tab("Due").className).toContain("border-b-transparent")
        expect(screen.getByText("Due").className).toContain("font-medium")

        expect(tab("Uno")).not.toHaveAttribute("aria-current")
        expect(tab("Uno").className).toContain("border-x-transparent")
        expect(tab("Uno").className).toContain("border-b-primary")
        expect(tab("Uno").className).toContain("border-x")
        expect(screen.getByText("Uno").className).not.toContain("font-medium")
    })

    it("has the height of the sidebar header, whatever the state", async () => {
        setup()
        await act(async () => { })
        expect(tab("Uno").className).toContain("min-h-[42px]")
        expect(tab("Due").className).toContain("min-h-[42px]")
    })

    it("moves the marks when another tab is activated", async () => {
        setup()
        await act(async () => { })
        await userEvent.click(screen.getByText("Uno"))

        expect(tab("Uno")).toHaveAttribute("aria-current", "true")
        expect(tab("Due")).not.toHaveAttribute("aria-current")
    })
})
