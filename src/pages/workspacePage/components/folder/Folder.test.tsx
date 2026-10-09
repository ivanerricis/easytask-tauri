import type { ReactNode } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { describe, expect, it, vi } from "vitest"
import type { Folder } from "@/types/types"
import { PreferencesContext, type PreferencesContextType } from "@/contexts/preferences-context-object"
import { ItemFolder } from "./Folder"

// The rename field needs the workspace data; the rows are tested without it
vi.mock("@/hooks/use-inline-rename", () => ({
    useInlineRename: () => ({ editing: false, error: null, start: () => {}, inputProps: {} }),
}))

vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ sidebarItemSize: "normal" }) }))
vi.mock("./ButtonMenuFolder", () => ({ ButtonMenuFolder: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: ReactNode }) => <>{children}</> }))

const folder = { id: 1, name: "Lavoro", color: "#ff0000", workspace_id: 1, parent_id: null } as unknown as Folder

const renderFolder = (intensity?: number) => {
    const tree = (
        <DndContext>
            <ItemFolder folder={folder} isOpen={false} onToggle={() => { }} />
        </DndContext>
    )
    render(intensity === undefined
        ? tree
        : <PreferencesContext.Provider value={{ colorIntensity: intensity } as PreferencesContextType}>{tree}</PreferencesContext.Provider>)
    return screen.getByRole("treeitem", { name: /Lavoro/ })
}

describe("Folder color intensity", () => {
    it("uses the base alphas (0.3, hover 0.5) without a provider", () => {
        const row = renderFolder()
        expect(row.style.backgroundColor).toBe("rgba(255, 0, 0, 0.3)")
        fireEvent.mouseEnter(row)
        expect(row.style.backgroundColor).toBe("rgba(255, 0, 0, 0.5)")
    })

    it("scales the alphas by the preference", () => {
        const row = renderFolder(1.5)
        expect(row.style.backgroundColor).toBe("rgba(255, 0, 0, 0.45)")
        fireEvent.mouseEnter(row)
        expect(row.style.backgroundColor).toBe("rgba(255, 0, 0, 0.75)")
    })

    it("keeps the color visible at the lowest intensity", () => {
        const row = renderFolder(0.25)
        expect(row.style.backgroundColor).toBe("rgba(255, 0, 0, 0.075)")
    })
})
