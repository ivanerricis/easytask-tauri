import { useEffect } from "react"
import type { ReactNode } from "react"
import { act, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DropResult } from "@hello-pangea/dnd"
import { GroupContainer } from "./GroupContainer"
import { useTabsActions } from "@/contexts/tabs-context"
import { getDBNoteData } from "@/db/queries/note"
import { updateDBGroupPositions } from "@/db/queries/group"
import { deferred, renderWithProviders } from "@/test/ui-render"
import { makeGroup } from "@/test/ui-fixtures"

vi.mock("@/db/queries/workspace", () => ({ getDBWorkspaces: vi.fn(), createDBWorkspace: vi.fn(), getDBWorkspaceData: vi.fn() }))
vi.mock("@/db/queries/note", () => ({ getDBNoteData: vi.fn(), createDBNoteInFolder: vi.fn(), createDBWorkspaceNote: vi.fn() }))
vi.mock("@/db/queries/folder", () => ({ createDBSubFolder: vi.fn(), createDBWorkspaceFolder: vi.fn(), updateDBFolderColorContent: vi.fn() }))
vi.mock("@/db/queries/section", () => ({ createDBSection: vi.fn(), createDBSectionInGroup: vi.fn() }))
vi.mock("@/db/queries/task", () => ({
    createDBSubTask: vi.fn(), createDBTask: vi.fn(), updateDBTaskCompletion: vi.fn(),
    updateDBTaskDescription: vi.fn(), updateDBTaskPriority: vi.fn(),
}))
vi.mock("@/db/queries/group", () => ({ updateDBGroupPositions: vi.fn() }))
vi.mock("@/db/queries/shared_queries", () => ({ renameDBItem: vi.fn(), updateDBColor: vi.fn(), deleteDBItem: vi.fn() }))

// Capture the drag end handler so the tests can drive it directly
let onDragEnd: (result: DropResult) => Promise<void>
vi.mock("@hello-pangea/dnd", () => ({
    DragDropContext: ({ children, onDragEnd: handler }: { children: ReactNode, onDragEnd: typeof onDragEnd }) => {
        onDragEnd = handler
        return <>{children}</>
    },
    Droppable: ({ children }: { children: (p: unknown) => ReactNode }) =>
        <>{children({ droppableProps: {}, innerRef: () => {}, placeholder: null })}</>,
    Draggable: ({ children }: { children: (p: unknown) => ReactNode }) =>
        <>{children({ draggableProps: {}, dragHandleProps: {}, innerRef: () => {} })}</>,
}))
vi.mock("./Group", () => ({
    Group: ({ group }: { group: { id: number } }) => <div data-testid="group">{group.id}</div>,
}))
vi.mock("../section/AddSection", () => ({ AddSection: () => null }))

function SelectNote({ children }: { children: ReactNode }) {
    const { openNote } = useTabsActions()
    useEffect(() => { openNote(1) }, [openNote])
    return <>{children}</>
}

const order = () => screen.getAllByTestId("group").map(el => el.textContent)

const drag = (from: number, to: number) => {
    const result = {
        source: { index: from, droppableId: "groups" },
        destination: { index: to, droppableId: "groups" },
    } as DropResult
    return act(() => onDragEnd(result))
}

describe("GroupContainer reorder", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.mocked(getDBNoteData).mockResolvedValue({
            groups: [makeGroup({ id: 1, position: 0 }), makeGroup({ id: 2, position: 1 }), makeGroup({ id: 3, position: 2 })],
            sections: [],
            tasks: [],
        } as never)
        vi.spyOn(console, "error").mockImplementation(() => {})
    })

    const renderLoaded = async () => {
        renderWithProviders(<SelectNote><GroupContainer /></SelectNote>)
        await waitFor(() => expect(screen.getAllByTestId("group")).toHaveLength(3))
    }

    it("loads the groups of the current note sorted by position", async () => {
        await renderLoaded()
        expect(order()).toEqual(["1", "2", "3"])
        expect(getDBNoteData).toHaveBeenCalledWith(1)
    })

    it("shows the new order immediately and persists it", async () => {
        const pending = deferred()
        vi.mocked(updateDBGroupPositions).mockReturnValue(pending.promise as never)
        await renderLoaded()

        let done!: Promise<void>
        await act(async () => { done = onDragEnd({ source: { index: 0, droppableId: "groups" }, destination: { index: 2, droppableId: "groups" } } as DropResult) })

        // Optimistic: visible while the write is still pending
        expect(order()).toEqual(["2", "3", "1"])

        await act(async () => {
            pending.resolve()
            await done
        })
        expect(order()).toEqual(["2", "3", "1"])
        const saved = vi.mocked(updateDBGroupPositions).mock.calls[0][0]
        expect(saved.map(g => [g.id, g.position])).toEqual([[2, 0], [3, 1], [1, 2]])
    })

    it("rolls back to the previous order when persisting fails", async () => {
        const pending = deferred()
        vi.mocked(updateDBGroupPositions).mockReturnValue(pending.promise as never)
        await renderLoaded()

        let done!: Promise<void>
        await act(async () => { done = onDragEnd({ source: { index: 0, droppableId: "groups" }, destination: { index: 1, droppableId: "groups" } } as DropResult) })
        expect(order()).toEqual(["2", "1", "3"])

        await act(async () => {
            pending.reject(new Error("db error"))
            await done
        })
        expect(order()).toEqual(["1", "2", "3"])
    })

    it("ignores drops without destination or onto the same index", async () => {
        await renderLoaded()

        await act(() => onDragEnd({ source: { index: 0, droppableId: "groups" }, destination: null } as DropResult))
        await drag(1, 1)

        expect(updateDBGroupPositions).not.toHaveBeenCalled()
        expect(order()).toEqual(["1", "2", "3"])
    })
})
