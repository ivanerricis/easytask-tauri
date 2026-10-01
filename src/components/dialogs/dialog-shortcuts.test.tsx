import type { ReactElement } from "react"
import { render as rtlRender, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it } from "vitest"
import { DialogShortcuts } from "./dialog-shortcuts"
import { SHORTCUT_CATEGORIES, categoryLabel } from "@/lib/shortcuts"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ShortcutsProvider })

describe("DialogShortcuts", () => {
    // Warm the lazy chunk so the first test does not pay for the import
    beforeAll(async () => { await import("./dialog-shortcuts-content") })

    it("is closed until ? is pressed, then lists every category", async () => {
        const user = userEvent.setup()
        render(<DialogShortcuts />)
        expect(screen.queryByRole("dialog")).toBeNull()

        await user.keyboard("?")
        expect(await screen.findByRole("dialog", {}, { timeout: 5000 })).toBeTruthy()
        for (const category of SHORTCUT_CATEGORIES) {
            expect(screen.getByRole("heading", { name: categoryLabel(category) })).toBeTruthy()
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
