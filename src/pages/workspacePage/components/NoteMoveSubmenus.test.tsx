import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { NoteDataTree } from "@/types/types"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import { SectionMoveSubmenu, TaskMoveSubmenu } from "./NoteMoveSubmenus"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const moveSection = vi.fn().mockResolvedValue(undefined)
const moveSectionToNewGroup = vi.fn().mockResolvedValue(undefined)
const moveTask = vi.fn().mockResolvedValue(undefined)
const getNoteData = vi.fn().mockResolvedValue(undefined)

const noteDataTree: NoteDataTree = {
    groups: [
        makeGroup({
            id: 1, position: 0, sections: [
                makeSection({ id: 1, groupID: 1, title: "Alpha", tasks: [makeTask({ id: 1, sectionID: 1, text: "Uno" }), makeTask({ id: 2, sectionID: 1, text: "Due" })] }),
                makeSection({ id: 2, groupID: 1, title: "Beta" }),
            ],
        }),
        makeGroup({ id: 2, position: 1, sections: [makeSection({ id: 3, groupID: 2, title: "Gamma" })] }),
    ],
}

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceData: () => ({
        noteDataTree, currentNote: { id: 7 }, getNoteData, moveSection, moveSectionToNewGroup, moveTask,
    }),
}))

async function openSubmenu(ui: React.ReactElement) {
    const user = userEvent.setup()
    render(
        <DropdownMenu>
            <DropdownMenuTrigger>menu</DropdownMenuTrigger>
            <DropdownMenuContent>{ui}</DropdownMenuContent>
        </DropdownMenu>,
    )
    await user.click(screen.getByText("menu"))
    const trigger = await screen.findByText("Sposta in…")
    const subTrigger = trigger.closest("[data-slot=dropdown-menu-sub-trigger]") as HTMLElement
    subTrigger.focus()
    await user.keyboard("{ArrowRight}")
    return user
}

beforeEach(() => vi.clearAllMocks())

describe("SectionMoveSubmenu", () => {
    it("lists the other groups and moves the section to the end of the chosen one, then reloads the note", async () => {
        const user = await openSubmenu(<SectionMoveSubmenu sectionId={1} />)
        expect(screen.queryByText("Gruppo 1")).not.toBeInTheDocument()
        expect(screen.getByText("Nuovo gruppo")).toBeInTheDocument()
        await user.click(await screen.findByText("Gruppo 2"))

        await waitFor(() => expect(moveSection).toHaveBeenCalledWith(1, 2, expect.any(Number)))
        expect(moveSection.mock.calls[0][2]).toBeGreaterThan(1000)
        await waitFor(() => expect(getNoteData).toHaveBeenCalledWith(7))
    })

    it("creates a new group at the end", async () => {
        const user = await openSubmenu(<SectionMoveSubmenu sectionId={1} />)
        await user.click(await screen.findByText("Nuovo gruppo"))
        await waitFor(() => expect(moveSectionToNewGroup).toHaveBeenCalledWith(1, 2))
        await waitFor(() => expect(getNoteData).toHaveBeenCalledWith(7))
    })
})

describe("TaskMoveSubmenu", () => {
    it("moves the task under another task of any section", async () => {
        const user = await openSubmenu(<TaskMoveSubmenu taskId={1} />)
        expect(screen.queryByText("Sezione Alpha")).not.toBeInTheDocument() // already top level there
        await user.click(await screen.findByText("↳ Due"))
        await waitFor(() => expect(moveTask).toHaveBeenCalledWith(1, { sectionId: 1, parentTaskId: 2 }, expect.any(Number)))
        await waitFor(() => expect(getNoteData).toHaveBeenCalledWith(7))
    })

    it("moves the task to a section as top level task", async () => {
        const user = await openSubmenu(<TaskMoveSubmenu taskId={1} />)
        await user.click(await screen.findByText("Sezione Gamma"))
        await waitFor(() => expect(moveTask).toHaveBeenCalledWith(1, { sectionId: 3, parentTaskId: null }, expect.any(Number)))
    })
})
