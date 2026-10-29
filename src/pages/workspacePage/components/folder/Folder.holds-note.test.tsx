import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { describe, expect, it, vi } from "vitest"
import type { Folder } from "@/types/types"
import * as notePath from "../sidebar/note-path"
import { ActiveAncestorsProvider } from "../sidebar/active-ancestors"
import { ItemFolder } from "./Folder"

// The rename field needs the workspace data; the rows are tested without it
vi.mock("@/hooks/use-inline-rename", () => ({
    useInlineRename: () => ({ editing: false, error: null, start: () => {}, inputProps: {} }),
}))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ sidebarItemSize: "normal" }) }))
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteSelector: (select: (id: number | null) => unknown) => select(7) }))
vi.mock("./ButtonMenuFolder", () => ({ ButtonMenuFolder: ({ children }: { children: ReactNode }) => <>{children}</> }))

const folder = (notes: { id: number }[]) => ({ id: 1, name: "Lavoro", color: null, subfolders: [], notes: notes.map(note => ({ ...note, folderID: 1 })) }) as unknown as Folder

const renderFolder = (isOpen: boolean, notes: { id: number }[]) => {
    const root = folder(notes)
    return render(
        <DndContext>
            <ActiveAncestorsProvider tree={{ rootFolders: [root], rootNotes: [] }}>
                <ItemFolder folder={root} isOpen={isOpen} onToggle={() => { }} />
            </ActiveAncestorsProvider>
        </DndContext>,
    )
}

describe("Folder that holds the open note", () => {
    it("closed, shows a dot and a text for the screen readers, besides the border", () => {
        renderFolder(false, [{ id: 7 }])
        const row = screen.getByRole("treeitem", { name: "Lavoro" })
        expect(row).toHaveClass("border-primary/60")
        expect(screen.getByTestId("holds-open-note")).toHaveClass("size-1.5", "rounded-full", "bg-primary")
        expect(row).toHaveAccessibleDescription("Contiene la nota aperta")
    })

    it("open, or without the note, has no mark", () => {
        const { unmount } = renderFolder(true, [{ id: 7 }])
        expect(screen.queryByTestId("holds-open-note")).toBeNull()
        unmount()
        renderFolder(false, [{ id: 8 }])
        expect(screen.queryByTestId("holds-open-note")).toBeNull()
    })

    it("also marks the folder that holds the note in a subfolder, from the ancestors computed once", () => {
        const inner = { id: 2, name: "Dentro", color: null, folderID: 1, subfolders: [], notes: [{ id: 7, folderID: 2 }] }
        const outer = { id: 1, name: "Lavoro", color: null, folderID: null, subfolders: [inner], notes: [] } as unknown as Folder
        render(
            <DndContext>
                <ActiveAncestorsProvider tree={{ rootFolders: [outer], rootNotes: [] }}>
                    <ItemFolder folder={outer} isOpen={false} onToggle={() => { }} />
                </ActiveAncestorsProvider>
            </DndContext>,
        )
        expect(screen.getByTestId("holds-open-note")).toBeInTheDocument()
    })

    it("computes the ancestors of the active note once, not once per folder", () => {
        const spy = vi.spyOn(notePath, "getAncestorFolderIds")
        const folders = [1, 2, 3].map(id => ({ id, name: `F${id}`, color: null, folderID: null, subfolders: [], notes: [] })) as unknown as Folder[]
        render(
            <DndContext>
                <ActiveAncestorsProvider tree={{ rootFolders: folders, rootNotes: [] }}>
                    {folders.map(item => <ItemFolder key={item.id} folder={item} isOpen={false} onToggle={() => { }} />)}
                </ActiveAncestorsProvider>
            </DndContext>,
        )
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockRestore()
    })
})
