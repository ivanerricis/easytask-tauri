import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SectionHeader } from "./SectionHeader"
import { makeSection, makeTask } from "@/test/ui-fixtures"

vi.mock("./ButtonMenuSection", () => ({ ButtonMenuSection: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceActions: () => ({ renameItem: vi.fn() }) }))
vi.mock("@/contexts/active-note-context", () => ({ useActiveNoteActions: () => ({ patchSection: vi.fn() }) }))
vi.mock("@/contexts/preferences-context", () => ({ usePreferences: () => ({ showProgressBar: true }) }))

describe("SectionHeader keyboard", () => {
    it("toggles the section with Enter and Space on the chevron button", async () => {
        const onOpenChange = vi.fn()
        render(<SectionHeader isOpen onOpenChange={onOpenChange} section={makeSection({ tasks: [makeTask()] })} />)
        const chevron = screen.getByRole("button", { name: "Compatta sezione" })
        chevron.focus()
        await userEvent.keyboard("{Enter}")
        await userEvent.keyboard(" ")
        expect(onOpenChange).toHaveBeenCalledTimes(2)
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it("starts editing the title with Enter", async () => {
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        screen.getByRole("button", { name: "Titolo" }).focus()
        await userEvent.keyboard("{Enter}")
        expect(screen.getByRole("textbox")).toHaveValue("Titolo")
    })
})
