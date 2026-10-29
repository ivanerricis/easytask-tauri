import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FormFooter } from "./form-footer"

describe("FormFooter", () => {
    it("has Annulla (a plain button) and a submit button with the given content", async () => {
        const onCancel = vi.fn()
        render(<form><FormFooter onCancel={onCancel}>Crea</FormFooter></form>)
        const cancel = screen.getByRole("button", { name: "Annulla" })
        expect(cancel).toHaveAttribute("type", "button")
        expect(screen.getByRole("button", { name: "Crea" })).toHaveAttribute("type", "submit")
        await userEvent.click(cancel)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("disables the submit button only", () => {
        render(<FormFooter onCancel={() => undefined} disabled>Crea</FormFooter>)
        expect(screen.getByRole("button", { name: "Crea" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Annulla" })).toBeEnabled()
    })
})
