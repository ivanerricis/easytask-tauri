import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotesSettings } from "./NotesSettings"

const setters = { setTaskDensity: vi.fn(), setNewTaskPosition: vi.fn(), setSpellcheck: vi.fn() }
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

    it("toggles the spell check", async () => {
        render(<NotesSettings />)
        const toggle = screen.getByRole("switch", { name: "Controllo ortografico" })
        expect(toggle).toBeChecked()
        await userEvent.click(toggle)
        expect(setters.setSpellcheck).toHaveBeenCalledWith(false)
    })
})
