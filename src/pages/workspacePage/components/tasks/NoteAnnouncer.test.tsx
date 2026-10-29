import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NoteAnnouncer } from "./NoteAnnouncer"
import { PaneContext } from "@/contexts/layout-context-object"
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

    it("is rendered only by the pane with the focus, so a message is read once", () => {
        const pane = (index: 0 | 1, focused: boolean) => (
            <PaneContext.Provider key={index} value={{ pane: index, focused, isFocused: () => focused, rootRef: { current: null } }}>
                <NoteAnnouncer />
            </PaneContext.Provider>
        )
        const { rerender } = render(<>{pane(0, false)}{pane(1, true)}</>)
        expect(screen.getAllByRole("status")).toHaveLength(1)
        act(() => announce("Spostato a destra"))
        expect(screen.getByRole("status").textContent?.trim()).toBe("Spostato a destra")
        rerender(<>{pane(0, true)}{pane(1, false)}</>)
        expect(screen.getAllByRole("status")).toHaveLength(1)
    })
})
