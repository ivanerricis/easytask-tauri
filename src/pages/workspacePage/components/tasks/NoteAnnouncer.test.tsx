import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NoteAnnouncer } from "./NoteAnnouncer"
import { announce } from "./note-announcer-store"

describe("NoteAnnouncer", () => {
    it("is a polite live region that reads the announced message, also when repeated", () => {
        render(<NoteAnnouncer />)
        const region = screen.getByRole("status")
        expect(region).toHaveAttribute("aria-live", "polite")
        act(() => announce("Spostato"))
        const first = region.textContent
        expect(first?.trim()).toBe("Spostato")
        act(() => announce("Spostato"))
        expect(region.textContent).not.toBe(first)
        expect(region.textContent?.trim()).toBe("Spostato")
    })
})
