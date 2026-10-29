import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DialogFormShell } from "./dialog-form-shell"

describe("DialogFormShell", () => {
    it("shows title, description and the form when open", () => {
        render(<DialogFormShell isOpen onOpenChange={() => undefined} title="Titolo" description="Descrizione"><input aria-label="campo" /></DialogFormShell>)
        expect(screen.getByRole("dialog", { name: "Titolo" })).toHaveAccessibleDescription("Descrizione")
        expect(screen.getByLabelText("campo")).toBeInTheDocument()
    })

    it("renders nothing when closed", () => {
        render(<DialogFormShell isOpen={false} onOpenChange={() => undefined} title="Titolo" description="D"><p>corpo</p></DialogFormShell>)
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("does not let clicks inside reach the parents in the React tree", async () => {
        const onParentClick = vi.fn()
        render(
            <div onClick={onParentClick}>
                <DialogFormShell isOpen onOpenChange={() => undefined} title="Titolo" description="D"><button>dentro</button></DialogFormShell>
            </div>,
        )
        await userEvent.click(screen.getByRole("button", { name: "dentro" }))
        expect(onParentClick).not.toHaveBeenCalled()
    })
})
