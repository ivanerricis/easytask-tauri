import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SectionHeader } from "./SectionHeader"
import { makeSection, makeTask } from "@/test/ui-fixtures"

vi.mock("./ButtonMenuSection", () => ({ ButtonMenuSection: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
const renameItem = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceActions: () => ({ renameItem }) }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ patchSection: vi.fn() }) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ showProgressBar: true }) }))

describe("SectionHeader keyboard", () => {
    beforeEach(() => { renameItem.mockReset(); renameItem.mockResolvedValue(undefined) })

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

    it("Escape cancels the title edit: no rename, and the blur that follows does not save it", async () => {
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        await user.click(screen.getByRole("button", { name: "Titolo" }))
        await user.type(screen.getByRole("textbox"), "X{Escape}")
        await user.click(document.body)

        expect(renameItem).not.toHaveBeenCalled()
        expect(screen.queryByRole("textbox")).toBeNull()
        expect(screen.getByRole("button", { name: "Titolo" })).toBeInTheDocument()
    })

    it("Enter saves once", async () => {
        const user = userEvent.setup()
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Titolo" })} />)
        await user.click(screen.getByRole("button", { name: "Titolo" }))
        await user.type(screen.getByRole("textbox"), "X{Enter}")

        expect(renameItem).toHaveBeenCalledTimes(1)
    })
})
