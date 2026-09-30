import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { DialogShortcuts } from "./dialog-shortcuts"
import { SHORTCUT_CATEGORIES } from "@/lib/shortcuts"

describe("DialogShortcuts", () => {
    it("is closed until ? is pressed, then lists every category", async () => {
        const user = userEvent.setup()
        render(<DialogShortcuts />)
        expect(screen.queryByRole("dialog")).toBeNull()

        await user.keyboard("?")
        expect(await screen.findByRole("dialog")).toBeTruthy()
        for (const category of SHORTCUT_CATEGORIES) {
            expect(screen.getByRole("heading", { name: category })).toBeTruthy()
        }
    })

    it("does not open while typing in an input", async () => {
        const user = userEvent.setup()
        render(<><input aria-label="campo" /><DialogShortcuts /></>)
        await user.click(screen.getByLabelText("campo"))
        await user.keyboard("?")
        expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("does not open with ctrl pressed", async () => {
        const user = userEvent.setup()
        render(<DialogShortcuts />)
        await user.keyboard("{Control>}?{/Control}")
        expect(screen.queryByRole("dialog")).toBeNull()
    })
})
