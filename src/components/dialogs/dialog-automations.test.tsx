import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DialogAutomations } from "./dialog-automations"
import { createDBAutomation, deleteDBAutomation, getDBAutomations, setDBAutomationEnabled, updateDBAutomation } from "@/db/queries/automation"
import { getDBNoteData } from "@/db/queries/note"
import type { Automation } from "@/lib/automations/types"

vi.mock("@/db/queries/automation", () => ({
    getDBAutomations: vi.fn(),
    createDBAutomation: vi.fn(),
    updateDBAutomation: vi.fn(),
    deleteDBAutomation: vi.fn(),
    setDBAutomationEnabled: vi.fn(),
}))
vi.mock("@/db/queries/note", () => ({ getDBNoteData: vi.fn() }))

const dates = { creation_date: "", creation_time: "", edit_date: "", edit_time: "" }
const noteData = {
    groups: [{ id: 1, noteID: 1, position: 0, name: "Flusso" }],
    sections: [
        { id: 1, groupID: 1, title: "Doing", position: 0, ...dates },
        { id: 2, groupID: 1, title: "Done", position: 1, ...dates },
    ],
    tasks: [],
}

const rule = (over: Partial<Automation> = {}): Automation => ({
    id: 10, noteId: 1, name: "Chiudi", enabled: true, position: 0,
    trigger: { type: "task.completed", sectionId: 1 },
    actions: [{ type: "moveTo", sectionId: 2, at: "bottom" }],
    ...over,
})

const mocked = vi.mocked

const renderDialog = (onOpenChange = vi.fn()) => {
    render(<DialogAutomations noteId={1} isOpen onOpenChange={onOpenChange} />)
    return onOpenChange
}

const pick = async (user: ReturnType<typeof userEvent.setup>, label: string, option: string) => {
    await user.click(screen.getByRole("combobox", { name: label }))
    await user.click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
    vi.resetAllMocks()
    mocked(getDBNoteData).mockResolvedValue(noteData as never)
    mocked(getDBAutomations).mockResolvedValue([])
    mocked(createDBAutomation).mockResolvedValue(undefined as never)
    mocked(updateDBAutomation).mockResolvedValue(undefined as never)
    mocked(deleteDBAutomation).mockResolvedValue(undefined as never)
    mocked(setDBAutomationEnabled).mockResolvedValue(undefined as never)
})

describe("DialogAutomations", () => {
    it("lists the rules with their description", async () => {
        mocked(getDBAutomations).mockResolvedValue([rule(), rule({ id: 11, name: null, trigger: { type: "task.created", sectionId: null }, actions: [{ type: "setPriority", value: true }] })])
        renderDialog()
        // Waits for the list itself: the close button of the dialog is there from the start, while the rules load
        expect(await screen.findByText("Quando un task viene completato in \"Doing\", sposta in fondo a \"Done\"")).toBeInTheDocument()
        expect(screen.getByText("Quando un task viene creato, aggiungi la priorità")).toBeInTheDocument()
    })

    it("shows the empty state", async () => {
        renderDialog()
        expect(await screen.findByText("Nessuna automazione in questa nota.")).toBeInTheDocument()
    })

    it("creates a rule from the editor", async () => {
        const user = userEvent.setup()
        renderDialog()
        await user.click(await screen.findByRole("button", { name: "Nuova automazione" }))
        await pick(user, "Nella sezione", "Doing")
        await pick(user, "Sposta in", "Done")
        await user.click(screen.getByRole("button", { name: "Salva" }))
        await waitFor(() => expect(createDBAutomation).toHaveBeenCalledTimes(1))
        expect(createDBAutomation).toHaveBeenCalledWith(1, {
            name: null,
            enabled: true,
            trigger: { type: "task.completed", sectionId: 1 },
            actions: [{ type: "moveTo", sectionId: 2, at: "bottom" }],
        })
    })

    it("toggles a rule", async () => {
        const user = userEvent.setup()
        mocked(getDBAutomations).mockResolvedValue([rule()])
        renderDialog()
        await user.click(await screen.findByRole("switch", { name: "Attiva l'automazione \"Chiudi\"" }))
        await waitFor(() => expect(setDBAutomationEnabled).toHaveBeenCalledWith(10, false))
    })

    it("asks for confirmation before deleting a rule", async () => {
        const user = userEvent.setup()
        mocked(getDBAutomations).mockResolvedValue([rule()])
        renderDialog()
        await user.click(await screen.findByRole("button", { name: "Elimina l'automazione \"Chiudi\"" }))
        expect(deleteDBAutomation).not.toHaveBeenCalled()
        expect(await screen.findByText("Eliminare l'automazione?")).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Elimina" }))
        await waitFor(() => expect(deleteDBAutomation).toHaveBeenCalledWith(10))
    })

    it("disables Save when the rule has no actions", async () => {
        const user = userEvent.setup()
        renderDialog()
        await user.click(await screen.findByRole("button", { name: "Nuova automazione" }))
        await user.click(screen.getByRole("button", { name: "Rimuovi azione" }))
        expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled()
    })

    it("asks before discarding an edited draft on Cancel", async () => {
        const user = userEvent.setup()
        renderDialog()
        await user.click(await screen.findByRole("button", { name: "Nuova automazione" }))
        await user.type(screen.getByLabelText("Nome (facoltativo)"), "Mia regola")
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        expect(await screen.findByText("Scartare le modifiche?")).toBeInTheDocument()

        // Cancelling the confirmation stays in the editor
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        await waitFor(() => expect(screen.queryByText("Scartare le modifiche?")).not.toBeInTheDocument())
        expect(screen.getByLabelText("Nome (facoltativo)")).toHaveValue("Mia regola")

        await user.click(screen.getByRole("button", { name: "Annulla" }))
        await user.click(await screen.findByRole("button", { name: "Scarta" }))
        expect(await screen.findByText("Nessuna automazione in questa nota.")).toBeInTheDocument()
        expect(createDBAutomation).not.toHaveBeenCalled()
    })

    it("cancels an untouched draft without asking", async () => {
        const user = userEvent.setup()
        renderDialog()
        await user.click(await screen.findByRole("button", { name: "Nuova automazione" }))
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        expect(screen.queryByText("Scartare le modifiche?")).not.toBeInTheDocument()
        expect(await screen.findByText("Nessuna automazione in questa nota.")).toBeInTheDocument()
    })
})
