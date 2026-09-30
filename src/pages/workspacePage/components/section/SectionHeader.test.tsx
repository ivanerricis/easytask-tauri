import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SectionHeader } from "./SectionHeader"
import { makeSection } from "@/test/ui-fixtures"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("./ButtonMenuSection", () => ({ ButtonMenuSection: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceActions: () => ({ renameItem: vi.fn() }),
}))
vi.mock("@/contexts/active-note-context", () => ({
    useActiveNoteActions: () => ({ refreshActiveNote: vi.fn() }),
}))
vi.mock("@/contexts/preferences-context", () => ({
    usePreferences: () => ({ showProgressBar: false }),
}))

describe("SectionHeader", () => {
    it("renders the title for a section without color", () => {
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Senza colore", color: null })} />)
        expect(screen.getByText("Senza colore")).toBeInTheDocument()
    })

    it("renders the title for a colored section", () => {
        render(<SectionHeader isOpen onOpenChange={vi.fn()} section={makeSection({ title: "Colorata", color: "#ff0000" })} />)
        expect(screen.getByText("Colorata")).toBeInTheDocument()
    })
})
