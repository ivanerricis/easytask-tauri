import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { createNoteSearchStore } from "./note-search-store"
import { NoteSearchField } from "./NoteSearchField"

// Radix tooltips measure their arrow with a ResizeObserver, which jsdom lacks
vi.stubGlobal("ResizeObserver", class { observe() { } unobserve() { } disconnect() { } })

describe("NoteSearchField", () => {
    it("wraps the disabled arrows in a span, so their tooltip still shows", async () => {
        const user = userEvent.setup()
        render(<NoteSearchField store={createNoteSearchStore()} inputRef={createRef<HTMLInputElement>()} />)
        const previous = screen.getByRole("button", { name: "Risultato precedente" })
        expect(previous).toBeDisabled()
        expect(previous.parentElement?.tagName).toBe("SPAN")
        await user.hover(previous.parentElement as HTMLElement)
        expect(await screen.findByRole("tooltip")).toHaveTextContent("Risultato precedente")
        expect(screen.getByRole("button", { name: "Risultato successivo" }).parentElement?.tagName).toBe("SPAN")
    })

    it("has a 28px, 14px text field", () => {
        render(<NoteSearchField store={createNoteSearchStore()} inputRef={createRef<HTMLInputElement>()} />)
        expect(screen.getByRole("textbox")).toHaveClass("h-7", "text-sm")
    })
})
