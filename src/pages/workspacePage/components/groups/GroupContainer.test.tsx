import { useEffect } from "react"
import type { ReactNode } from "react"
import { act, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GroupContainer } from "./GroupContainer"
import { useTabsActions } from "@/contexts/use-tabs"
import { useGroupMoves } from "../note-dnd-state"
import { getDBNoteData } from "@/db/queries/note"
import { getDBNoteAudioFiles } from "@/db/queries/audio"
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

const prefs = { showAudioFileCount: true, showGroupSeparators: false }
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("@/db/queries/audio", () => ({ getDBGroupAudioFiles: vi.fn(), getDBNoteAudioFiles: vi.fn() }))

// The group stub exposes the move the drag & drop runs on drop (the real dnd-kit drag is not drivable in jsdom)
let moveGroupTo: (groupId: number, index: number) => Promise<void>
vi.mock("./Group", () => ({
    Group: function GroupStub({ group }: { group: { id: number } }) {
        moveGroupTo = useGroupMoves().moveGroupTo
        return <div data-testid="group">{group.id}</div>
    },
}))
vi.mock("../section/AddSection", () => ({ AddSection: () => null }))

function SelectNote({ children }: { children: ReactNode }) {
    const { openNote } = useTabsActions()
    useEffect(() => { openNote(1) }, [openNote])
    return <>{children}</>
}

const order = () => screen.getAllByTestId("group").map(el => el.textContent)

describe("GroupContainer reorder", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        prefs.showGroupSeparators = false
        vi.mocked(getDBNoteAudioFiles).mockResolvedValue({})
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
        await act(async () => { done = moveGroupTo(1, 2) })

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
        await act(async () => { done = moveGroupTo(1, 1) })
        expect(order()).toEqual(["2", "1", "3"])

        await act(async () => {
            pending.reject(new Error("db error"))
            await done
        })
        expect(order()).toEqual(["1", "2", "3"])
    })

    it("shows the empty note hints only when the note has no groups", async () => {
        vi.mocked(getDBNoteData).mockResolvedValue({ groups: [], sections: [], tasks: [] } as never)
        renderWithProviders(<SelectNote><GroupContainer /></SelectNote>)
        expect(await screen.findByText("Nota vuota")).toBeTruthy()
    })

    it("does not show the empty note hints when there are groups", async () => {
        await renderLoaded()
        expect(screen.queryByText("Nota vuota")).toBeNull()
    })

    it("draws no guide line between groups by default", async () => {
        await renderLoaded()
        expect(screen.queryAllByTestId("group-separator")).toHaveLength(0)
    })

    it("draws an aria-hidden vertical line between adjacent groups when enabled", async () => {
        prefs.showGroupSeparators = true
        await renderLoaded()
        const lines = screen.getAllByTestId("group-separator")
        expect(lines).toHaveLength(2)
        lines.forEach(line => expect(line).toHaveAttribute("aria-hidden", "true"))
    })
})
