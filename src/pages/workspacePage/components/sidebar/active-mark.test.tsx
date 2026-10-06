import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Folder, Note } from "@/types/types"
import { ItemFolder } from "../folder/Folder"
import { ItemNote } from "../note/Note"

const active: { id: number | null } = { id: null }

vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ sidebarItemSize: "normal" }) }))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote: vi.fn() }), useActiveNoteId: () => active.id }))
vi.mock("../folder/ButtonMenuFolder", () => ({ ButtonMenuFolder: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("../note/ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: ReactNode }) => <>{children}</> }))

const note = (id: number, name: string) => ({ id, name, color: null }) as unknown as Note
const folder = (id: number, name: string, notes: Note[], subfolders: Folder[] = []) =>
    ({ id, name, color: null, notes, subfolders }) as unknown as Folder

const renderIn = (ui: ReactNode) => render(<DndContext>{ui}</DndContext>)

beforeEach(() => { active.id = null })

describe("note open in the active tab", () => {
    it("marks only the active note, in bold, and flags it as current", () => {
        active.id = 2
        renderIn(<><ItemNote note={note(1, "Spesa")} /><ItemNote note={note(2, "Idee")} /></>)

        const open = screen.getByRole("button", { name: /Idee/ })
        expect(open).toHaveAttribute("aria-current", "true")
        expect(open.className).toContain("border-primary")
        expect(open.className).toContain("ring-primary")
        expect(open.querySelector("span.font-semibold")).not.toBeNull()
        const other = screen.getByRole("button", { name: /Spesa/ })
        expect(other).not.toHaveAttribute("aria-current")
        expect(other.className).toContain("border-accent")
        expect(other.className).not.toContain("ring-primary")
        expect(other.querySelector("span.font-semibold")).toBeNull()
    })

    it("marks nothing without an active note", () => {
        renderIn(<ItemNote note={note(1, "Spesa")} />)
        const row = screen.getByRole("button", { name: /Spesa/ })
        expect(row).not.toHaveAttribute("aria-current")
        expect(row.className).toContain("border-accent")
    })
})

describe("collapsed folder holding the active note", () => {
    const tree = folder(1, "Progetti", [note(9, "Altra")], [folder(2, "Interni", [note(5, "Retro")])])

    it("shows a discreet mark when it is collapsed, even for a note in a subfolder", () => {
        active.id = 5
        renderIn(<ItemFolder folder={tree} isOpen={false} onToggle={vi.fn()} />)
        const row = screen.getByRole("button", { name: /Progetti/ })
        expect(row).toHaveAttribute("data-holds-active", "true")
        expect(row.className).toContain("border-primary/60")
    })

    it("shows nothing when it is expanded (the note itself is visible)", () => {
        active.id = 5
        renderIn(<ItemFolder folder={tree} isOpen onToggle={vi.fn()} />)
        expect(screen.getByRole("button", { name: /Progetti/ })).not.toHaveAttribute("data-holds-active")
    })

    it("shows nothing when the active note is elsewhere", () => {
        active.id = 77
        renderIn(<ItemFolder folder={tree} isOpen={false} onToggle={vi.fn()} />)
        expect(screen.getByRole("button", { name: /Progetti/ })).not.toHaveAttribute("data-holds-active")
    })
})
