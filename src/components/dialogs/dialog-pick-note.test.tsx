import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NoteWithPath } from "@/hooks/use-all-notes"
import type { Note } from "@/types/types"
import { DialogPickNote } from "./dialog-pick-note"

const list: { value: NoteWithPath[] } = { value: [] }
vi.mock("@/hooks/use-all-notes", () => ({ useAllNotes: () => list.value }))

const item = (id: number, name: string, path = ""): NoteWithPath => ({ note: { id, name } as Note, path })
const onOpenChange = vi.fn()
const onPick = vi.fn()

const setup = () =>
    render(
        <DialogPickNote
            isOpen
            onOpenChange={onOpenChange}
            onPick={onPick}
            title="Scegli una nota"
            description="Il template sarà una copia."
            placeholder="Cerca la nota..."
        />,
    )

beforeEach(() => {
    vi.clearAllMocks()
    list.value = [item(1, "Sprint", "Progetti"), item(2, "Retro", "Progetti / Interni"), item(3, "Appunti")]
})

// cmdk measures the list: jsdom has neither ResizeObserver nor scrollIntoView
beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() { /* none */ } unobserve() { /* none */ } disconnect() { /* none */ } })
    Element.prototype.scrollIntoView = vi.fn()
})

describe("DialogPickNote", () => {
    it("lists the notes with the folder of each one", () => {
        setup()
        expect(screen.getByText("Sprint")).toBeInTheDocument()
        expect(screen.getByText("Progetti / Interni")).toBeInTheDocument()
        expect(screen.getByText("Appunti")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Cerca la nota...")).toBeInTheDocument()
    })

    it("filters by name and by folder", async () => {
        const user = userEvent.setup()
        setup()
        const box = screen.getByPlaceholderText("Cerca la nota...")

        await user.type(box, "retro")
        await waitFor(() => expect(screen.queryByText("Sprint")).not.toBeInTheDocument())
        expect(screen.getByText("Retro")).toBeInTheDocument()

        await user.clear(box)
        await user.type(box, "interni")
        await waitFor(() => expect(screen.queryByText("Sprint")).not.toBeInTheDocument())
        expect(screen.getByText("Retro")).toBeInTheDocument()
    })

    it("tells when nothing matches", async () => {
        const user = userEvent.setup()
        setup()
        await user.type(screen.getByPlaceholderText("Cerca la nota..."), "zzzz")
        expect(await screen.findByText("Nessun risultato.")).toBeInTheDocument()
    })

    it("closes and gives back the note that was chosen", async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByText("Retro"))
        expect(onPick).toHaveBeenCalledWith({ id: 2, name: "Retro" })
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })
})
