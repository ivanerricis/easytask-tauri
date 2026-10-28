import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { InlineNameInput } from "./inline-name-input"

describe("InlineNameInput", () => {
    it("limita il nome a 120 caratteri", () => {
        render(<InlineNameInput error={null} aria-label="Nome" defaultValue="Nota" />)
        expect(screen.getByLabelText("Nome")).toHaveAttribute("maxlength", "120")
    })
})
