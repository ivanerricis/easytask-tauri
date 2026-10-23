import { useEffect } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { TabsProvider } from "@/contexts/tabs-context"
import { useTabsActions } from "@/contexts/use-tabs"
import { TREE_REVEAL_EVENT } from "@/lib/tree-reveal"
import type { Folder, Note } from "@/types/types"
import { makeNote } from "@/test/ui-fixtures"
import type { TreeData } from "./sidebar/tree-dnd"
import { PathBar } from "./PathBar"

const dates = { creation_date: "", creation_time: "", edit_date: "", edit_time: "" }
const folder = (id: number, name: string, folderID: number | null, subfolders: Folder[] = [], notes: Note[] = []): Folder => ({
    id, workspaceID: 1, folderID, name, position: 0, ...dates, subfolders, notes,
})

// Radice, Lavoro { Progetti { A { B { Profonda } } , Nidificata }, Piano }
const deep = makeNote({ id: 4, name: "Profonda", folderID: 14 })
const nested = makeNote({ id: 2, name: "Nidificata", folderID: 11 })
const tree: TreeData = {
    rootFolders: [folder(10, "Lavoro", null, [folder(11, "Progetti", 10, [folder(12, "A", 11, [folder(13, "B", 12, [folder(14, "C", 13, [], [deep])])])], [nested])])],
    rootNotes: [makeNote({ id: 1, name: "Radice", folderID: null })],
}
const notes = [makeNote({ id: 1, name: "Radice" }), nested, deep]

vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceData: () => ({ workspaceDataTree: tree }) }))
const prefs = { hideCompletedTasks: false, setHideCompletedTasks: vi.fn() }
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("@/lib/store/preferences", () => ({ getReopenNotes: vi.fn().mockResolvedValue(false) }))
vi.mock("@/lib/store/tabs", () => ({ getWorkspaceTabs: vi.fn(), saveWorkspaceTabs: vi.fn() }))
// Radix tooltips measure their arrow with a ResizeObserver, which jsdom lacks
vi.stubGlobal("ResizeObserver", class { observe() { } unobserve() { } disconnect() { } })

const Opener = ({ ids }: { ids: number[] }) => {
    const { openNote } = useTabsActions()
    useEffect(() => { ids.forEach(openNote) }, [ids, openNote])
    return null
}

const setup = async (ids: number[]) => {
    const view = render(
        <ShortcutsProvider>
            <TabsProvider notes={notes} workspaceId={null}>
                <Opener ids={ids} />
                <PathBar />
            </TabsProvider>
        </ShortcutsProvider>,
    )
    await act(async () => { })
    return view
}

const crumbs = () => screen.getAllByRole("button", { name: /nella barra laterale/ }).map(button => button.textContent)

describe("PathBar path", () => {
    beforeEach(() => {
        prefs.hideCompletedTasks = false
        prefs.setHideCompletedTasks.mockReset()
    })

    it("shows only the note for a note in the root, marked as the current page", async () => {
        await setup([1])
        expect(screen.getByRole("navigation", { name: "Percorso della nota" })).toBeInTheDocument()
        expect(crumbs()).toEqual(["Radice"])
        expect(screen.getByRole("button", { name: "Mostra Radice nella barra laterale" })).toHaveAttribute("aria-current", "page")
    })

    it("lists the folders and then the note for a nested note", async () => {
        await setup([2])
        expect(crumbs()).toEqual(["Lavoro", "Progetti", "Nidificata"])
        expect(screen.getByRole("button", { name: "Mostra Lavoro nella barra laterale" })).not.toHaveAttribute("aria-current")
        expect(screen.getByRole("button", { name: "Mostra Nidificata nella barra laterale" })).toHaveAttribute("aria-current", "page")
        expect(screen.getByText("Nidificata").className).toContain("truncate")
        expect(screen.getByText("Nidificata")).toHaveAttribute("title", "Nidificata")
    })

    it("keeps the first segment and the last two, with an ellipsis, on a long path", async () => {
        await setup([4])
        expect(crumbs()).toEqual(["Lavoro", "C", "Profonda"])
        expect(document.querySelector("[data-slot='breadcrumb-ellipsis']")).not.toBeNull()
    })

    it("asks the sidebar to show the item of the clicked segment", async () => {
        await setup([2])
        const listener = vi.fn()
        window.addEventListener(TREE_REVEAL_EVENT, listener)
        await userEvent.click(screen.getByRole("button", { name: "Mostra Progetti nella barra laterale" }))
        await userEvent.click(screen.getByRole("button", { name: "Mostra Nidificata nella barra laterale" }))
        window.removeEventListener(TREE_REVEAL_EVENT, listener)
        expect(listener.mock.calls.map(([event]) => (event as CustomEvent).detail)).toEqual([
            { type: "folder", id: 11 },
            { type: "note", id: 2 },
        ])
    })
})

describe("PathBar hide completed toggle", () => {
    beforeEach(() => {
        prefs.hideCompletedTasks = false
        prefs.setHideCompletedTasks.mockReset()
    })

    it("shows a single toggle reflecting the preference with aria-pressed, whatever the number of open notes", async () => {
        const { unmount } = await setup([1, 2])
        expect(screen.getAllByRole("button", { name: "Nascondi task completati" })).toHaveLength(1)
        expect(screen.getByRole("button", { name: "Nascondi task completati" })).toHaveAttribute("aria-pressed", "false")
        unmount()

        prefs.hideCompletedTasks = true
        await setup([1])
        expect(screen.getByRole("button", { name: "Nascondi task completati" })).toHaveAttribute("aria-pressed", "true")
    })

    it("toggles the preference on click", async () => {
        await setup([1])
        await userEvent.click(screen.getByRole("button", { name: "Nascondi task completati" }))
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledTimes(1)
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledWith(true)
    })

    it("toggles the preference once with Ctrl+Shift+H, whatever the number of open notes", async () => {
        await setup([1, 2])
        fireEvent.keyDown(window, { key: "H", ctrlKey: true, shiftKey: true })
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledTimes(1)
        expect(prefs.setHideCompletedTasks).toHaveBeenCalledWith(true)
    })

    it("does not trigger with Ctrl+H alone (go home)", async () => {
        await setup([1])
        fireEvent.keyDown(window, { key: "h", ctrlKey: true })
        expect(prefs.setHideCompletedTasks).not.toHaveBeenCalled()
    })
})
