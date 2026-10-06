import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DEFAULT_NEW_COLOR, OptionalColorField } from "./optional-color-field"

describe("OptionalColorField", () => {
    it("offers the add button when there is no color and proposes the default one", async () => {
        const onChange = vi.fn()
        render(<OptionalColorField value={undefined} onChange={onChange} />)
        await userEvent.click(screen.getByRole("button", { name: "Aggiungi colore" }))
        expect(onChange).toHaveBeenCalledWith(DEFAULT_NEW_COLOR)
    })

    it("shows the picker and removes the color with the labelled X button", async () => {
        const onChange = vi.fn()
        const { container } = render(<OptionalColorField value="#112233" onChange={onChange} />)
        expect(container.querySelector("input[type=color]")).toHaveValue("#112233")
        await userEvent.click(screen.getByRole("button", { name: "Chiudi la tavolozza" }))
        expect(onChange).toHaveBeenCalledWith(undefined)
    })
})
