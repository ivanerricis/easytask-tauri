import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Note } from "@/types/types"
import { NoteList } from "./NoteList"

const tabs = [{ id: 1, name: "Uno" }, { id: 2, name: "Due" }, { id: 3, name: "Tre" }] as unknown as Note[]
const activateNote = vi.fn()

vi.mock("@/contexts/use-tabs", () => ({
    useTabs: () => ({ tabs }),
    useTabsActions: () => ({ reorderTabs: vi.fn(), activateNote }),
}))
// The tab itself: only what the keyboard handler of the list reads
vi.mock("./NoteHeader", () => ({
    NoteHeader: ({ note }: { note: Note }) => <button role="tab" data-note-id={note.id}>{note.name}</button>,
}))

describe("NoteList keyboard", () => {
    beforeEach(() => activateNote.mockClear())

    it("moves to the next and previous tab with the arrows", () => {
        render(<NoteList />)
        fireEvent.keyDown(screen.getByRole("tab", { name: "Due" }), { key: "ArrowRight" })
        expect(activateNote).toHaveBeenLastCalledWith(3)
        fireEvent.keyDown(screen.getByRole("tab", { name: "Uno" }), { key: "ArrowLeft" })
        expect(activateNote).toHaveBeenLastCalledWith(3)
    })

    it.each([
        ["Ctrl", { ctrlKey: true }],
        ["Cmd", { metaKey: true }],
        ["Alt", { altKey: true }],
        ["Shift", { shiftKey: true }],
    ])("leaves %s + arrow to the shortcuts", (_, modifier) => {
        render(<NoteList />)
        const tab = screen.getByRole("tab", { name: "Due" })
        const event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true, ...modifier })
        tab.dispatchEvent(event)
        expect(activateNote).not.toHaveBeenCalled()
        expect(event.defaultPrevented).toBe(false)
    })
})
