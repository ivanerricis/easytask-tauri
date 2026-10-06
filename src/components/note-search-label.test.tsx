import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WorkspaceContext } from "@/contexts/workspace-context-object"
import { NoteSearchLabel } from "./note-search-label"

const inWorkspace = (ui: React.ReactNode) =>
    render(<WorkspaceContext.Provider value={{ currentWorkspace: { name: "Lavoro" } } as never}>{ui}</WorkspaceContext.Provider>)

describe("NoteSearchLabel", () => {
    it("shows the full location (workspace and folders) under the name", () => {
        inWorkspace(<NoteSearchLabel name="Retro" path="Progetti / Interni" />)
        expect(screen.getByText("Retro")).toBeInTheDocument()
        expect(screen.getByText("Lavoro / Progetti / Interni")).toBeInTheDocument()
    })

    it("shows just the workspace for a note at the root", () => {
        inWorkspace(<NoteSearchLabel name="Appunti" path="" />)
        expect(screen.getByText("Lavoro")).toBeInTheDocument()
    })

    it("shows just the folders outside a workspace provider", () => {
        render(<NoteSearchLabel name="Retro" path="Progetti" />)
        expect(screen.getByText("Progetti")).toBeInTheDocument()
    })
})
