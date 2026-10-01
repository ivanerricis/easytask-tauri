import { useEffect } from "react"
import type { ReactNode } from "react"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import type { NoteDataTree } from "@/types/types"
import { TabsProvider } from "@/contexts/tabs-context"
import { useSelectTask, useTabsActions } from "@/contexts/use-tabs"
import { UndoContext, type UndoContextType } from "@/contexts/undo/context"
import { DetailsPanel } from "./DetailsPanel"
import { makeGroup, makeNote, makeSection, makeTask } from "@/test/ui-fixtures"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
const updateTaskPriority = vi.fn()
const updateTaskDescription = vi.fn()
const updateItemColor = vi.fn()
const patchTask = vi.fn()
const rollback = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => ({ updateTaskPriority, updateTaskDescription, updateItemColor }),
}))
let tree: NoteDataTree | null
vi.mock("@/contexts/use-active-note", () => ({
    useActiveNote: () => ({ noteDataTree: tree }),
    useActiveNoteActions: () => ({ patchTask }),
}))
vi.mock("@/components/dialogs/dialog-add-color", () => ({
    DialogAddColor: ({ addColorItem }: { addColorItem: (type: string, id: number, color?: string) => Promise<void> }) => (
        <button onClick={() => { addColorItem("task", 10, "#ff0000").catch(() => { }) }}>pick color</button>
    ),
}))

const recorder = { taskDescription: vi.fn(), taskPriority: vi.fn(), color: vi.fn() }
const undoValue = { recorder } as unknown as UndoContextType

const buildTree = (): NoteDataTree => ({
    groups: [
        makeGroup({
            id: 1,
            sections: [
                makeSection({
                    id: 5, title: "Da fare", tasks: [
                        makeTask({
                            id: 10, text: "Scrivere il report", description: "bozza", priority: false, color: "#00ff00",
                            creation_date: "2026-03-04", creation_time: "09:30:00", edit_date: "2026-03-05", edit_time: "11:15:00",
                            subtasks: [makeTask({ id: 11, completed: true }), makeTask({ id: 12 }), makeTask({ id: 13, completed: true })],
                        }),
                        makeTask({ id: 20, text: "Senza sottotask", completed: true }),
                    ],
                }),
            ],
        }),
        makeGroup({ id: 2, name: "Extra", sections: [makeSection({ id: 6, title: "Altro", tasks: [makeTask({ id: 30, text: "Altro task" })] })] }),
    ],
})

function Setup({ children, noteId = 1 }: { children: ReactNode, noteId?: number | null }) {
    const { openNote } = useTabsActions()
    useEffect(() => { if (noteId !== null) openNote(noteId) }, [openNote, noteId])
    return <>{children}</>
}

function Selector() {
    const select = useSelectTask()
    return (
        <>
            <button onClick={() => select(10)}>select 10</button>
            <button onClick={() => select(20)}>select 20</button>
            <button onClick={() => select(30)}>select 30</button>
            <button onClick={() => select(999)}>select missing</button>
            <button onClick={() => select(null)}>clear</button>
        </>
    )
}

const renderPanel = (noteId: number | null = 1) => render(
    <TabsProvider notes={[makeNote({ id: 1, name: "Mia nota", color: "#ff0000", creation_date: "2026-01-02", creation_time: "08:00:00", edit_date: "2026-02-03", edit_time: "12:00:00" })]} workspaceId={null}>
        <UndoContext.Provider value={undoValue}>
            <Setup noteId={noteId}><Selector /><DetailsPanel /></Setup>
        </UndoContext.Provider>
    </TabsProvider>,
)

const select = async (id: number | "missing") => {
    await userEvent.click(screen.getByRole("button", { name: `select ${id}` }))
}

beforeEach(() => {
    vi.clearAllMocks()
    tree = buildTree()
    updateTaskPriority.mockResolvedValue(undefined)
    updateTaskDescription.mockResolvedValue(undefined)
    updateItemColor.mockResolvedValue(undefined)
    patchTask.mockReturnValue(rollback)
})
afterEach(async () => { await i18n.changeLanguage("it") })

describe("DetailsPanel without selection", () => {
    it("asks to open a note when there is none", () => {
        renderPanel(null)
        expect(screen.getByText("Apri una nota per vederne i dettagli.")).toBeInTheDocument()
    })

    it("waits for the data of the note", () => {
        tree = null
        renderPanel()
        expect(screen.getByText("Caricamento dei dettagli...")).toBeInTheDocument()
    })

    it("shows the note: name, statistics, progress, color and dates", async () => {
        renderPanel()
        expect(await screen.findByRole("heading", { name: "Dettagli della nota" })).toHaveTextContent("Mia nota")
        expect(screen.getByText("2 gruppi")).toBeInTheDocument()
        expect(screen.getByText("2 sezioni")).toBeInTheDocument()
        // 2 root tasks + 3 subtasks in the first section, 1 in the second: 6 tasks, completed: 11, 13 and 20
        expect(screen.getByText("6 task")).toBeInTheDocument()
        expect(screen.getByText("3 di 6 task completati (50%)")).toBeInTheDocument()
        expect(screen.getByRole("progressbar", { name: "3 di 6 task completati" })).toBeInTheDocument()
        expect(screen.getByText("Data creazione: 02-01-2026 08:00:00")).toBeInTheDocument()
        expect(screen.getByText("Data modifica: 03-02-2026 12:00:00")).toBeInTheDocument()
    })

    it("shows the empty state of the progress for a note without tasks", () => {
        tree = { groups: [] }
        renderPanel()
        expect(screen.getByText("0 gruppi")).toBeInTheDocument()
        expect(screen.getByText("Nessun task")).toBeInTheDocument()
        expect(screen.queryByRole("progressbar")).toBeNull()
    })

    it("follows the language and the date format", async () => {
        await i18n.changeLanguage("en")
        renderPanel()
        expect(await screen.findByRole("heading", { name: "Note details" })).toBeInTheDocument()
        expect(screen.getByText("2 groups")).toBeInTheDocument()
        expect(screen.getByText("Created: 01/02/2026 08:00:00")).toBeInTheDocument()
    })
})

describe("DetailsPanel with a selected task", () => {
    it("shows text, path, status, priority, color, description, subtasks and dates", async () => {
        renderPanel()
        await select(10)
        expect(await screen.findByRole("heading", { name: "Dettagli del task" })).toHaveTextContent("Scrivere il report")
        expect(screen.getByText("Mia nota › Gruppo 1 › Da fare")).toBeInTheDocument()
        expect(screen.getByText("Da completare")).toBeInTheDocument()
        expect(screen.getByRole("switch", { name: "Priorità alta" })).not.toBeChecked()
        expect(screen.getByRole("textbox", { name: "Descrizione" })).toHaveValue("bozza")
        expect(screen.getByText("2 di 3 completati (67%)")).toBeInTheDocument()
        expect(screen.getByText("Data creazione: 04-03-2026 09:30:00")).toBeInTheDocument()
        expect(screen.getByText("Data modifica: 05-03-2026 11:15:00")).toBeInTheDocument()
    })

    it("uses the group name in the path and shows a completed task without subtasks", async () => {
        renderPanel()
        await select(30)
        expect(await screen.findByText("Mia nota › Extra › Altro")).toBeInTheDocument()
        await select(20)
        expect(screen.getByText("Completato")).toBeInTheDocument()
        expect(screen.getByText("Nessun sotto-task")).toBeInTheDocument()
        expect(screen.queryByRole("progressbar")).toBeNull()
    })

    it("goes back to the note when the selection is cleared or the task is not in the note", async () => {
        renderPanel()
        await select(10)
        await select("missing")
        expect(await screen.findByRole("heading", { name: "Dettagli della nota" })).toBeInTheDocument()
        await select(10)
        await userEvent.click(screen.getByRole("button", { name: "clear" }))
        expect(screen.getByRole("heading", { name: "Dettagli della nota" })).toBeInTheDocument()
    })

    it("toggles the priority optimistically, records it for undo and keeps it", async () => {
        renderPanel()
        await select(10)
        await userEvent.click(await screen.findByRole("switch", { name: "Priorità alta" }))
        expect(patchTask).toHaveBeenCalledWith(10, { priority: true })
        await waitFor(() => expect(updateTaskPriority).toHaveBeenCalledWith(10, true))
        await waitFor(() => expect(recorder.taskPriority).toHaveBeenCalledWith(10, "Scrivere il report", false, true))
        expect(rollback).not.toHaveBeenCalled()
    })

    it("rolls the priority back with a toast when the write fails", async () => {
        updateTaskPriority.mockRejectedValue(new Error("boom"))
        renderPanel()
        await select(10)
        await userEvent.click(await screen.findByRole("switch", { name: "Priorità alta" }))
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalledWith("Impossibile modificare la priorità")
        expect(recorder.taskPriority).not.toHaveBeenCalled()
    })

    it("changes the color with the existing palette, optimistically and with rollback", async () => {
        const user = userEvent.setup()
        renderPanel()
        await select(10)
        await user.click(await screen.findByRole("button", { name: "Cambia colore" }))
        await user.click(await screen.findByText("pick color"))
        expect(patchTask).toHaveBeenCalledWith(10, { color: "#ff0000" })
        await waitFor(() => expect(updateItemColor).toHaveBeenCalledWith("task", 10, "#ff0000"))
        expect(rollback).not.toHaveBeenCalled()

        updateItemColor.mockRejectedValue(new Error("boom"))
        await user.click(await screen.findByText("pick color"))
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
    })

    describe("description", () => {
        const field = () => screen.getByRole("textbox", { name: "Descrizione" })

        it("shows Save and Cancel only while the text differs", async () => {
            const user = userEvent.setup()
            renderPanel()
            await select(10)
            await screen.findByRole("heading", { name: "Dettagli del task" })
            expect(screen.queryByRole("button", { name: "Salva" })).toBeNull()
            await user.type(field(), "!")
            expect(screen.getByRole("button", { name: "Salva" })).toBeInTheDocument()
            await user.click(screen.getByRole("button", { name: "Annulla" }))
            expect(field()).toHaveValue("bozza")
            expect(screen.queryByRole("button", { name: "Salva" })).toBeNull()
            expect(updateTaskDescription).not.toHaveBeenCalled()
        })

        it("saves optimistically and records the undo", async () => {
            const user = userEvent.setup()
            renderPanel()
            await select(10)
            await screen.findByRole("heading", { name: "Dettagli del task" })
            await user.type(field(), " finale")
            await user.click(screen.getByRole("button", { name: "Salva" }))
            expect(patchTask).toHaveBeenCalledWith(10, { description: "bozza finale" })
            await waitFor(() => expect(updateTaskDescription).toHaveBeenCalledWith(10, "bozza finale"))
            await waitFor(() => expect(recorder.taskDescription).toHaveBeenCalledWith(10, "Scrivere il report", "bozza", "bozza finale"))
            expect(rollback).not.toHaveBeenCalled()
            await waitFor(() => expect(screen.queryByRole("button", { name: "Salva" })).toBeNull())
        })

        it("clearing the text removes the description", async () => {
            const user = userEvent.setup()
            renderPanel()
            await select(10)
            await screen.findByRole("heading", { name: "Dettagli del task" })
            await user.clear(field())
            await user.click(screen.getByRole("button", { name: "Salva" }))
            await waitFor(() => expect(updateTaskDescription).toHaveBeenCalledWith(10, undefined))
            expect(recorder.taskDescription).toHaveBeenCalledWith(10, "Scrivere il report", "bozza", "")
        })

        it("rolls back with a toast and keeps the draft when the write fails", async () => {
            const user = userEvent.setup()
            updateTaskDescription.mockRejectedValue(new Error("disk full"))
            renderPanel()
            await select(10)
            await screen.findByRole("heading", { name: "Dettagli del task" })
            await user.type(field(), "x")
            await user.click(screen.getByRole("button", { name: "Salva" }))
            await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
            expect(toast.error).toHaveBeenCalledWith("disk full")
            expect(recorder.taskDescription).not.toHaveBeenCalled()
            expect(field()).toHaveValue("bozzax")
            expect(screen.getByRole("button", { name: "Salva" })).toBeEnabled()
        })

        it("drops the draft when another task is selected", async () => {
            const user = userEvent.setup()
            renderPanel()
            await select(10)
            await screen.findByRole("heading", { name: "Dettagli del task" })
            await user.type(field(), "x")
            await act(async () => { await select(20) })
            expect(field()).toHaveValue("")
            expect(within(document.body).queryByRole("button", { name: "Salva" })).toBeNull()
        })
    })
})
