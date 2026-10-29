import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NoteTemplate } from "@/types/template"
import { DialogNoteFromTemplate } from "./dialog-note-from-template"

const actions = { createNoteFromTemplate: vi.fn() }
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceActions: () => actions,
    useWorkspaceState: () => ({ workspaceDataTree: null }),
}))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote: vi.fn() }) }))
vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
const template = { id: 5, workspaceID: 1, name: "Sprint tipo", color: null, content: { groups: [] } } as unknown as NoteTemplate

beforeEach(() => {
    vi.resetAllMocks()
    actions.createNoteFromTemplate.mockResolvedValue(8)
})

describe("DialogNoteFromTemplate", () => {
    it("seleziona il nome precompilato all'apertura, come Rinomina", () => {
        render(<DialogNoteFromTemplate template={template} isOpen onOpenChange={vi.fn()} />)
        const input = screen.getByLabelText("Nome") as HTMLInputElement
        expect(input).toHaveFocus()
        expect(input.selectionStart).toBe(0)
        expect(input.selectionEnd).toBe("Sprint tipo".length)
    })

    it("due istanze hanno id diversi e le etichette puntano ai propri campi", () => {
        render(<><DialogNoteFromTemplate template={template} isOpen onOpenChange={vi.fn()} /><DialogNoteFromTemplate template={template} isOpen onOpenChange={vi.fn()} /></>)
        const names = screen.getAllByLabelText("Nome")
        const destinations = screen.getAllByLabelText("Destinazione")
        expect(names).toHaveLength(2)
        expect(names[0].id).not.toBe(names[1].id)
        expect(destinations).toHaveLength(2)
        expect(destinations[0].id).not.toBe(destinations[1].id)
    })

    it("collega l'errore al campo nome con aria-describedby", async () => {
        const user = userEvent.setup()
        actions.createNoteFromTemplate.mockRejectedValue(new Error("Nome già usato"))
        render(<DialogNoteFromTemplate template={template} isOpen onOpenChange={vi.fn()} />)
        await user.click(screen.getByRole("button", { name: "Crea" }))
        const alert = await screen.findByRole("alert")
        await waitFor(() => expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-describedby", alert.id))
    })

    it("limita il nome a 120 caratteri", () => {
        render(<DialogNoteFromTemplate template={template} isOpen onOpenChange={vi.fn()} />)
        expect(screen.getByLabelText("Nome")).toHaveAttribute("maxlength", "120")
    })
})
