import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { MAX_NAME_LENGTH } from "@/lib/names"
import { NameField } from "./name-field"

const Controlled = (props: Partial<React.ComponentProps<typeof NameField>>) => {
    const [value, setValue] = useState("Nota")
    return <NameField label="Nome" value={value} onChange={setValue} {...props} />
}

describe("NameField", () => {
    it("labels the input and limits its length", () => {
        render(<Controlled />)
        const input = screen.getByLabelText("Nome")
        expect(input).toHaveValue("Nota")
        expect(input).toHaveAttribute("maxlength", String(MAX_NAME_LENGTH))
        expect(input).toHaveAttribute("name", "name")
    })

    it("hands over the typed text", async () => {
        const onChange = vi.fn()
        render(<NameField label="Nome" value="" onChange={onChange} />)
        await userEvent.type(screen.getByLabelText("Nome"), "a")
        expect(onChange).toHaveBeenCalledWith("a")
    })

    it("links the error with aria-invalid and aria-describedby", () => {
        render(<Controlled error="Già esistente" />)
        const input = screen.getByLabelText("Nome")
        const alert = screen.getByRole("alert")
        expect(alert).toHaveTextContent("Già esistente")
        expect(input).toHaveAttribute("aria-invalid", "true")
        expect(input).toHaveAttribute("aria-describedby", alert.id)
    })

    it("has no aria-invalid and no alert without an error", () => {
        render(<Controlled error={null} />)
        expect(screen.getByLabelText("Nome")).not.toHaveAttribute("aria-invalid")
        expect(screen.getByLabelText("Nome")).not.toHaveAttribute("aria-describedby")
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("leaves the error to the parent with showError=false", () => {
        render(<><Controlled error="Errore" showError={false} errorId="mine" /><p id="mine">custom</p></>)
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        expect(screen.getByLabelText("Nome")).toHaveAttribute("aria-describedby", "mine")
    })

    it("uses the given id", () => {
        render(<Controlled id="field" />)
        expect(screen.getByLabelText("Nome")).toHaveAttribute("id", "field")
    })

    it("selects the text on focus when asked", async () => {
        render(<Controlled selectOnFocus />)
        const input = screen.getByLabelText("Nome") as HTMLInputElement
        await userEvent.click(input)
        expect(input.selectionStart).toBe(0)
        expect(input.selectionEnd).toBe(4)
    })

    it("hides the label visually but keeps it for screen readers", () => {
        render(<Controlled hideLabel />)
        expect(screen.getByText("Nome")).toHaveClass("sr-only")
    })

    it("puts the extra next to the input", () => {
        render(<Controlled><button>Colore</button></Controlled>)
        const input = screen.getByLabelText("Nome")
        expect(input.parentElement).toContainElement(screen.getByRole("button", { name: "Colore" }))
    })

    it("keeps the input in the same place when the extra goes away", () => {
        const { rerender } = render(<NameField label="Nome" value="" onChange={() => undefined}>{<i />}</NameField>)
        const input = screen.getByLabelText("Nome")
        rerender(<NameField label="Nome" value="" onChange={() => undefined}>{false}</NameField>)
        expect(screen.getByLabelText("Nome")).toBe(input)
    })
})
