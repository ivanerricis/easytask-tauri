import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ColorPalette } from "./color-palette"

const customPicker = (container: HTMLElement) => container.querySelector("input[type=color]") as HTMLInputElement

describe("ColorPalette", () => {
    it("picks the color of a swatch at once", async () => {
        const onPick = vi.fn()
        render(<ColorPalette onPick={onPick} />)
        await userEvent.click(screen.getByRole("button", { name: "Colore #e6194b" }))
        expect(onPick).toHaveBeenCalledWith("#e6194b", expect.anything())
    })

    it("marks the swatch of the current color", () => {
        render(<ColorPalette value="#3CB44B" onPick={vi.fn()} />)
        expect(screen.getByRole("button", { name: "Colore #3cb44b" })).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button", { name: "Colore #e6194b" })).toHaveAttribute("aria-pressed", "false")
    })

    it("shows a color outside the palette in the custom square", () => {
        const { container } = render(<ColorPalette value="#123456" onPick={vi.fn()} />)
        expect(customPicker(container)).toHaveValue("#123456")
        expect(screen.getAllByRole("button").every(button => button.getAttribute("aria-pressed") === "false")).toBe(true)
    })

    it("picks the custom color once the picker is closed (change), not while it moves (input)", () => {
        const onPick = vi.fn()
        const { container } = render(<ColorPalette onPick={onPick} />)
        const picker = customPicker(container)
        fireEvent.input(picker, { target: { value: "#00ff00" } })
        expect(onPick).not.toHaveBeenCalled()
        fireEvent.change(picker, { target: { value: "#00ff00" } })
        expect(onPick).toHaveBeenCalledWith("#00ff00")
    })

    it("names the custom picker for the screen readers", () => {
        render(<ColorPalette onPick={vi.fn()} />)
        expect(screen.getByLabelText("Scegli un altro colore")).toBeInTheDocument()
    })
})
