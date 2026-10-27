import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SelectionMark } from "./SelectionMark"

describe("SelectionMark", () => {
    it("renders nothing when the row is not selected", () => {
        const { container } = render(<SelectionMark selected={false} />)
        expect(container).toBeEmptyDOMElement()
        expect(screen.queryByText("selezionato")).not.toBeInTheDocument()
    })

    it("selected: a dashed outline (not only a color) and a text for the screen readers", () => {
        render(<SelectionMark selected />)
        const mark = screen.getByTestId("selection-mark")
        expect(mark).toHaveAttribute("aria-hidden", "true")
        expect(mark.className).toContain("border-dashed")
        const text = screen.getByText("selezionato")
        expect(text).toHaveClass("sr-only")
        expect(text).not.toHaveAttribute("aria-hidden")
    })
})
