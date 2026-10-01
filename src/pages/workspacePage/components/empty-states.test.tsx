import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Folder, Group as GroupType, Section } from "@/types/types"
import { ItemFolder } from "./folder/Folder"
import { Group } from "./groups/Group"
import { SectionBody } from "./section/SectionBody"
import { WorkspacesContainer } from "@/pages/mainPage/components/WorkspacesContainer"
import { FileTree } from "./sidebar/FileTree"

vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ sidebarItemSize: "normal" }) }))
vi.mock("./folder/ButtonMenuFolder", () => ({ ButtonMenuFolder: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("./sidebar/tree-row", () => ({
    useTreeRow: () => ({ ref: vi.fn(), attributes: {}, listeners: {}, isDragging: false }),
    isInsideZone: () => false,
    stopDragActivation: {},
    wasTreeJustDragged: () => false,
    treeRowKeyDown: () => undefined,
    markTreeDragEnd: vi.fn(),
    treeRowKey: (type: string, id: number) => `${type}-${id}`,
}))
vi.mock("./tasks/AddTask", () => ({ AddTask: () => <div>add-task</div> }))
vi.mock("./tasks/Task", () => ({ Task: () => <div>task</div> }))
vi.mock("./section/AddSection", () => ({ AddSection: () => <div>add-section</div> }))
vi.mock("./section/Section", () => ({ Section: () => <div>section</div> }))
vi.mock("./groups/GroupHeader", () => ({ GroupHeader: () => <div>group-header</div> }))
vi.mock("./groups/GroupAudioFiles", () => ({ GroupAudioFiles: () => null }))
vi.mock("@/contexts/use-tabs", () => ({ useGroupOpen: () => [true] }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: { id: 1, name: "WS" } }) }))
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceData: () => ({ workspaceDataTree: { rootFolders: [], rootNotes: [] }, getWorkspaceData: vi.fn(), moveTreeItem: vi.fn() }),
}))
vi.mock("./sidebar/VirtualTree", () => ({ VirtualTree: () => null }))
vi.mock("../../mainPage/components/WorkSpace", () => ({ WorkSpaceItem: () => <div>workspace-item</div> }))

const folder = (over: Partial<Folder>) => ({ id: 1, name: "Cartella", color: "#ff0000", subfolders: [], notes: [], ...over }) as unknown as Folder

describe("empty state suggestions", () => {
    it("workspace list: title, description and the new workspace shortcut", () => {
        render(<WorkspacesContainer workspaces={[]} />)
        expect(screen.getByText("Nessun workspace trovato")).toBeInTheDocument()
        expect(screen.getByText(/Un workspace raccoglie cartelle/)).toBeInTheDocument()
        expect(screen.getByRole("listitem")).toHaveTextContent("Crea un workspaceCtrl+N")
    })

    it("workspace list: no suggestion when there are workspaces", () => {
        render(<WorkspacesContainer workspaces={[{ id: 1 } as never]} />)
        expect(screen.queryByTestId("empty-state")).toBeNull()
    })

    it("sidebar without folders or notes suggests how to create them", () => {
        render(<FileTree collapsedIds={new Set()} onToggleFolder={vi.fn()} onExpandFolder={vi.fn()} />)
        const items = screen.getAllByRole("listitem")
        expect(items[0]).toHaveTextContent("Crea una cartellaCtrl+M")
        expect(items[1]).toHaveTextContent("Crea una notaCtrl+N")
    })

    it("an open empty folder shows the suggestion; a closed one or one with content does not", () => {
        const { rerender } = render(<ItemFolder folder={folder({})} isOpen onToggle={vi.fn()} />)
        expect(screen.getByText("Cartella vuota")).toBeInTheDocument()

        rerender(<ItemFolder folder={folder({})} isOpen={false} onToggle={vi.fn()} />)
        expect(screen.queryByText("Cartella vuota")).toBeNull()

        rerender(<ItemFolder folder={folder({ notes: [{ id: 5 }] as never })} isOpen onToggle={vi.fn()} />)
        expect(screen.queryByText("Cartella vuota")).toBeNull()
    })

    it("a section without tasks suggests writing the first one, with the Enter key", () => {
        const section = { id: 1, title: "S", tasks: [] } as unknown as Section
        const { rerender } = render(<SectionBody isOpen section={section} />)
        expect(screen.getByText("Nessun task")).toBeInTheDocument()
        expect(screen.getByRole("listitem")).toHaveTextContent("Aggiungi il taskInvio")
        expect(screen.getByText("add-task")).toBeInTheDocument()

        rerender(<SectionBody isOpen section={{ ...section, tasks: [{ id: 3, subtasks: [] }] } as unknown as Section} />)
        expect(screen.queryByText("Nessun task")).toBeNull()
    })

    it("a group without sections suggests adding one, with the new group shortcut", () => {
        const group = { id: 1, name: null, position: 0, sections: [] } as unknown as GroupType
        const { rerender } = render(<Group group={group} />)
        expect(screen.getByText("Gruppo vuoto")).toBeInTheDocument()
        expect(screen.getByRole("listitem")).toHaveTextContent("Aggiungi una sezioneAlt+N")

        rerender(<Group group={{ ...group, sections: [{ id: 2 }] } as unknown as GroupType} />)
        expect(screen.queryByText("Gruppo vuoto")).toBeNull()
    })
})
