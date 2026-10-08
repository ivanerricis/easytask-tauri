import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { DialogTemplates } from "./dialog-templates"
import { makeWorkspace } from "@/test/ui-fixtures"
import type { NoteTemplate, NoteTemplateContent } from "@/types/template"
import type { WorkspaceDataTree } from "@/types/types"

const tree: WorkspaceDataTree = {
    rootFolders: [
        {
            id: 7, workspaceID: 4, folderID: null, name: "Progetti", position: 0, creation_date: "", creation_time: "", edit_date: "", edit_time: "",
            notes: [], subfolders: [
                { id: 8, workspaceID: 4, folderID: 7, name: "Interni", position: 0, creation_date: "", creation_time: "", edit_date: "", edit_time: "", notes: [], subfolders: [] },
            ],
        },
    ],
    rootNotes: [],
}

const data = {
    getTemplates: vi.fn(),
    updateTemplateFromNote: vi.fn(),
    createTemplateFromNote: vi.fn(),
    createNoteFromTemplate: vi.fn(),
    notes: [] as unknown[],
    folders: [] as unknown[],
    getWorkspaceData: vi.fn(),
    deleteItem: vi.fn(),
    renameItem: vi.fn(),
    workspaceDataTree: tree as WorkspaceDataTree | null,
}
const tabs = { openNote: vi.fn() }
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => data,
    useWorkspaceState: () => data,
    useWorkspaceData: () => data,
}))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => tabs }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: makeWorkspace({ id: 4 }) }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const content: NoteTemplateContent = {
    version: 1,
    groups: [
        {
            name: null, position: 0, sections: [
                {
                    title: "S1", color: null, position: 0, tasks: [
                        { text: "A", description: null, completed: false, priority: false, color: null, position: 0, subtasks: [
                            { text: "A1", description: null, completed: false, priority: false, color: null, position: 0, subtasks: [] },
                        ] },
                    ],
                },
                { title: "S2", color: null, position: 1, tasks: [] },
            ],
        },
    ],
}

const makeTemplate = (over: Partial<NoteTemplate> = {}): NoteTemplate => ({
    id: 1, workspaceID: 4, sourceNoteID: 10, sourceNoteName: "Sprint", name: "Retro", color: null, content,
    creation_date: "2026-09-02", creation_time: "10:00", edit_date: "2026-09-02", edit_time: "10:00", ...over,
})

const templates = [
    makeTemplate(),
    makeTemplate({ id: 2, name: "Onboarding", sourceNoteID: null, sourceNoteName: null, content: { version: 1, groups: [] } }),
]

describe("DialogTemplates", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        data.workspaceDataTree = tree
        data.notes = []
        data.folders = []
        data.createTemplateFromNote.mockResolvedValue(77)
        data.getTemplates.mockResolvedValue(templates)
        data.updateTemplateFromNote.mockResolvedValue(undefined)
        data.createNoteFromTemplate.mockResolvedValue(55)
        data.getWorkspaceData.mockResolvedValue(undefined)
        data.deleteItem.mockResolvedValue(undefined)
        data.renameItem.mockResolvedValue(undefined)
    })

    it("lists the templates with source note, date and counts", async () => {
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        expect(await screen.findByText("Retro")).toBeInTheDocument()
        expect(data.getTemplates).toHaveBeenCalledWith(4)
        expect(screen.getByText("Onboarding")).toBeInTheDocument()
        expect(screen.getByText(/Da: Sprint · Creato il/)).toBeInTheDocument()
        expect(screen.getAllByText(/Creato il 02-09-2026/)).toHaveLength(2)
        expect(screen.getByText("1 gruppo · 2 sezioni · 2 task")).toBeInTheDocument()
        expect(screen.getByText("0 gruppi · 0 sezioni · 0 task")).toBeInTheDocument()
        expect(screen.getByText(/Nota eliminata/)).toBeInTheDocument()
    })

    it("shows the empty state", async () => {
        data.getTemplates.mockResolvedValue([])
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        expect(await screen.findByText("Nessun template. Creane uno da una nota con il pulsante \"Nuovo template\", o dal menu della nota.")).toBeInTheDocument()
    })

    it("disables 'Aggiorna dalla nota' when the source note no longer exists", async () => {
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await screen.findByText("Retro")
        expect(screen.getByRole("button", { name: "Aggiorna Retro dalla nota" })).toBeEnabled()
        expect(screen.getByRole("button", { name: "Aggiorna Onboarding dalla nota" })).toBeDisabled()
    })

    it("creates a note from a template in the chosen folder (the context updates the tree) and opens the note", async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        render(<DialogTemplates isOpen onOpenChange={onOpenChange} />)
        await user.click(await screen.findByRole("button", { name: "Crea nota da Retro" }))

        const name = await screen.findByLabelText("Nome")
        expect(name).toHaveValue("Retro")
        await user.clear(name)
        await user.type(name, "Retro di settembre")

        const destination = screen.getByLabelText("Destinazione")
        expect(destination).toHaveTextContent("Radice del workspace")
        await user.click(destination)
        expect(screen.getAllByRole("option").map(o => o.textContent?.trim())).toEqual(["Radice del workspace", "Progetti", "Interni"])
        await user.click(screen.getByRole("option", { name: "Interni" }))
        await user.click(screen.getByRole("button", { name: "Crea nota" }))

        await waitFor(() => expect(data.createNoteFromTemplate).toHaveBeenCalledWith(1, 4, 8, "Retro di settembre", null))
        expect(data.getWorkspaceData).not.toHaveBeenCalled()
        expect(tabs.openNote).toHaveBeenCalledWith(55)
        expect(toast.success).toHaveBeenCalledWith("Nota creata")
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it("creates in the workspace root by default and shows the error on a clash", async () => {
        const user = userEvent.setup()
        data.createNoteFromTemplate.mockRejectedValueOnce({ code: "NOTE_EXISTS", message: "Esiste già una nota con questo nome nella cartella di destinazione." })
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Crea nota da Retro" }))
        await user.click(screen.getByRole("button", { name: "Crea nota" }))

        expect(await screen.findByText("Esiste già una nota con questo nome nella cartella di destinazione.")).toBeInTheDocument()
        expect(data.createNoteFromTemplate).toHaveBeenCalledWith(1, 4, null, "Retro", null)
        expect(tabs.openNote).not.toHaveBeenCalled()
    })

    it("moves the template to the trash after confirmation and reloads the list", async () => {
        const user = userEvent.setup()
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Elimina Retro" }))
        await user.click(await screen.findByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(data.deleteItem).toHaveBeenCalledWith("note_template", 1))
        await waitFor(() => expect(data.getTemplates).toHaveBeenCalledTimes(2))
    })

    it("renames a template", async () => {
        const user = userEvent.setup()
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Rinomina Retro" }))
        const input = await screen.findByDisplayValue("Retro")
        await user.clear(input)
        await user.type(input, "Retrospettiva")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        await waitFor(() => expect(data.renameItem).toHaveBeenCalledWith("note_template", 1, "Retrospettiva"))
        await waitFor(() => expect(data.getTemplates).toHaveBeenCalledTimes(2))
    })

    it("asks for confirmation before overwriting the template from its note", async () => {
        const user = userEvent.setup()
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Aggiorna Retro dalla nota" }))
        expect(await screen.findByText("Aggiornare il template dalla nota?")).toBeInTheDocument()
        expect(data.updateTemplateFromNote).not.toHaveBeenCalled()

        await user.click(screen.getByRole("button", { name: "Sovrascrivi template" }))
        await waitFor(() => expect(data.updateTemplateFromNote).toHaveBeenCalledWith(1))
        expect(toast.success).toHaveBeenCalledWith("Template aggiornato")
        await waitFor(() => expect(data.getTemplates).toHaveBeenCalledTimes(2))
    })

    it("does not overwrite when the confirmation is cancelled", async () => {
        const user = userEvent.setup()
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await user.click(await screen.findByRole("button", { name: "Aggiorna Retro dalla nota" }))
        await user.click(await screen.findByRole("button", { name: "Annulla" }))
        expect(data.updateTemplateFromNote).not.toHaveBeenCalled()
    })

    it("shows a search box only with many templates and filters by name", async () => {
        const user = userEvent.setup()
        data.getTemplates.mockResolvedValue(Array.from({ length: 9 }, (_, i) => makeTemplate({ id: i + 1, name: `Tpl ${i + 1}` })))
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await screen.findByText("Tpl 1")
        await user.type(screen.getByLabelText("Cerca template"), "tpl 9")
        expect(screen.getByText("Tpl 9")).toBeInTheDocument()
        expect(screen.queryByText("Tpl 1")).not.toBeInTheDocument()
    })

    it("has no search box with few templates", async () => {
        render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
        await screen.findByText("Retro")
        expect(screen.queryByLabelText("Cerca template")).not.toBeInTheDocument()
    })

    describe("creating a template from an existing note", () => {
        const note = (id: number, name: string) => ({ id, name })

        beforeEach(() => {
            // cmdk (the note picker) measures its list: jsdom has neither ResizeObserver nor scrollIntoView
            vi.stubGlobal("ResizeObserver", class { observe() { /* none */ } unobserve() { /* none */ } disconnect() { /* none */ } })
            Element.prototype.scrollIntoView = vi.fn()
            data.notes = [note(1, "Appunti")]
            data.folders = [{ id: 7, name: "Progetti", notes: [note(2, "Sprint")], subfolders: [] }]
        })

        it("has a New template button, disabled when the workspace has no notes", async () => {
            data.notes = []
            data.folders = []
            render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
            await screen.findByText("Retro")
            const button = screen.getByRole("button", { name: "Nuovo template" })
            expect(button).toBeDisabled()
            // The reason is in a tooltip (a disabled button gets no pointer events: it hangs on the span around it)
            await userEvent.hover(button.parentElement as HTMLElement)
            expect(await screen.findByRole("tooltip")).toHaveTextContent("Non ci sono note da cui creare un template.")
        })

        it("lets the user choose a note, names the template after it and adds it to the list", async () => {
            const user = userEvent.setup()
            const onOpenChange = vi.fn()
            render(<DialogTemplates isOpen onOpenChange={onOpenChange} />)
            await screen.findByText("Retro")
            expect(screen.getByRole("button", { name: "Nuovo template" })).toBeEnabled()

            await user.click(screen.getByRole("button", { name: "Nuovo template" }))
            // The picker lists every note with its folder
            expect(await screen.findByPlaceholderText("Cerca la nota da cui creare il template…")).toBeInTheDocument()
            expect(screen.getByText("Appunti")).toBeInTheDocument()
            expect(screen.getByText("Progetti")).toBeInTheDocument()

            await user.click(screen.getByText("Sprint"))
            // The next step is the usual create-template dialog, with the name of the note
            const nameInput = await screen.findByLabelText("Nome del template")
            expect(nameInput).toHaveValue("Sprint")

            data.getTemplates.mockClear()
            await user.clear(nameInput)
            await user.type(nameInput, "Sprint base")
            await user.click(screen.getByRole("button", { name: "Crea template" }))

            await waitFor(() => expect(data.createTemplateFromNote).toHaveBeenCalledWith(2, "Sprint base"))
            expect(toast.success).toHaveBeenCalled()
            // The list of the dialog is reloaded, and the Template dialog itself stays open
            await waitFor(() => expect(data.getTemplates).toHaveBeenCalledWith(4))
            expect(onOpenChange).not.toHaveBeenCalled()
        })

        it("creates nothing when the choice of the note is closed", async () => {
            const user = userEvent.setup()
            render(<DialogTemplates isOpen onOpenChange={vi.fn()} />)
            await screen.findByText("Retro")
            await user.click(screen.getByRole("button", { name: "Nuovo template" }))
            await screen.findByPlaceholderText("Cerca la nota da cui creare il template…")
            await user.keyboard("{Escape}")
            await waitFor(() => expect(screen.queryByPlaceholderText("Cerca la nota da cui creare il template…")).not.toBeInTheDocument())
            expect(screen.queryByLabelText("Nome del template")).not.toBeInTheDocument()
            expect(data.createTemplateFromNote).not.toHaveBeenCalled()
        })
    })
})
