import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Note } from "@/types/types"
import { ItemNote } from "../note/Note"

const openNote = vi.fn()

vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({ sidebarItemSize: "normal" }),
}))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote }), useActiveNoteId: () => null }))
vi.mock("../note/ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({
    TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const note = { id: 7, name: "Nota", color: "#00ff00" } as unknown as Note

describe("sidebar note row keyboard", () => {
    it("is focusable and opens the note with Enter", async () => {
        openNote.mockClear()
        render(<ItemNote note={note} />)
        const row = screen.getByRole("button", { name: /Nota/ })
        expect(row).toHaveAttribute("tabindex", "0")
        row.focus()
        await userEvent.keyboard("{Enter}")
        expect(openNote).toHaveBeenCalledWith(7)
    })
})
