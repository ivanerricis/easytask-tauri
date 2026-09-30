import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SectionHeader } from "./SectionHeader"
import { makeSection } from "@/test/ui-fixtures"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("./ButtonMenuSection", () => ({ ButtonMenuSection: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
const renameItem = vi.fn()
const rollback = vi.fn()
const patchSection = vi.fn()
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceActions: () => ({ renameItem }),
}))
vi.mock("@/contexts/active-note-context", () => ({
    useActiveNoteActions: () => ({ patchSection }),
}))
vi.mock("@/contexts/preferences-context", () => ({
    usePreferences: () => ({ showProgressBar: false }),
}))

beforeEach(() => {
    vi.clearAllMocks()
    renameItem.mockResolvedValue(undefined)
    patchSection.mockReturnValue(rollback)
})

describe("SectionHeader", () => {
    it("renames on Enter with an optimistic patch and no reload", async () => {
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ id: 4, title: "Old" })} />)
        await user.click(screen.getByText("Old"))
        await user.type(screen.getByRole("textbox"), "er{Enter}")
        await waitFor(() => expect(renameItem).toHaveBeenCalledWith("section", 4, "Older"))
        expect(patchSection).toHaveBeenCalledWith(4, { title: "Older" })
        expect(rollback).not.toHaveBeenCalled()
    })

    it("rolls the title back and shows a toast when the write fails", async () => {
        const user = userEvent.setup()
        renameItem.mockRejectedValue(new Error("boom"))
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ id: 4, title: "Old" })} />)
        await user.click(screen.getByText("Old"))
        await user.type(screen.getByRole("textbox"), "er{Enter}")
        await waitFor(() => expect(rollback).toHaveBeenCalledTimes(1))
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Impossibile cambiare il titolo della sezione"))
    })

    it("does not touch anything for an unchanged or empty title", async () => {
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ id: 4, title: "Old" })} />)
        await user.click(screen.getByText("Old"))
        await user.clear(screen.getByRole("textbox"))
        await user.keyboard("{Enter}")
        expect(patchSection).not.toHaveBeenCalled()
        expect(renameItem).not.toHaveBeenCalled()
    })

    it("renders the title for a section without color", () => {
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Senza colore", color: null })} />)
        expect(screen.getByText("Senza colore")).toBeInTheDocument()
    })

    it("renders the title for a colored section", () => {
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Colorata", color: "#ff0000" })} />)
        expect(screen.getByText("Colorata")).toBeInTheDocument()
    })
})
