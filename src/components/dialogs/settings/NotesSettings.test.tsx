import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotesSettings } from "./NotesSettings"

const setters = { setTaskDensity: vi.fn(), setNewTaskPosition: vi.fn(), setSpellcheck: vi.fn(), setConfirmDeleteWithContent: vi.fn(), setKeepAddingTasks: vi.fn(), setShowTaskInsertLine: vi.fn() }
let prefs: Record<string, unknown>

vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ ...prefs, ...setters }) }))

describe("NotesSettings", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        prefs = { taskDensity: "normal", newTaskPosition: "bottom", spellcheck: true }
    })

    it("changes the task density", async () => {
        render(<NotesSettings />)
        await userEvent.click(screen.getByRole("radio", { name: "Compatta" }))
        expect(setters.setTaskDensity).toHaveBeenCalledWith("compact")
    })

    it("changes where new tasks go", async () => {
        render(<NotesSettings />)
        await userEvent.click(screen.getByRole("radio", { name: "In cima" }))
        expect(setters.setNewTaskPosition).toHaveBeenCalledWith("top")
    })

    it("toggles keep adding tasks", async () => {
        prefs.keepAddingTasks = true
        render(<NotesSettings />)
        const toggle = screen.getByRole("switch", { name: "Continua ad aggiungere task" })
        expect(toggle).toBeChecked()
        await userEvent.click(toggle)
        expect(setters.setKeepAddingTasks).toHaveBeenCalledWith(false)
    })

    it("toggles the task insert line", async () => {
        prefs.showTaskInsertLine = true
        render(<NotesSettings />)
        const toggle = screen.getByRole("switch", { name: "Linea per inserire un task" })
        expect(toggle).toBeChecked()
        await userEvent.click(toggle)
        expect(setters.setShowTaskInsertLine).toHaveBeenCalledWith(false)
    })

    it("toggles the delete confirmation", async () => {
        prefs.confirmDeleteWithContent = true
        render(<NotesSettings />)
        const toggle = screen.getByRole("switch", { name: "Conferma l'eliminazione solo se c'è contenuto" })
        expect(toggle).toBeChecked()
        await userEvent.click(toggle)
        expect(setters.setConfirmDeleteWithContent).toHaveBeenCalledWith(false)
    })

    it("toggles the spell check", async () => {
        render(<NotesSettings />)
        const toggle = screen.getByRole("switch", { name: "Controllo ortografico" })
        expect(toggle).toBeChecked()
        await userEvent.click(toggle)
        expect(setters.setSpellcheck).toHaveBeenCalledWith(false)
    })
})
