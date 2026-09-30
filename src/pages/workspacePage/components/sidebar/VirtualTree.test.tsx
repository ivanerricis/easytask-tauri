import { render, screen } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { beforeAll, describe, expect, it, vi } from "vitest"
import type { Note } from "@/types/types"
import { flattenTree } from "./flat-tree"
import { VirtualTree } from "./VirtualTree"

vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ sidebarItemSize: "normal" }) }))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote: vi.fn() }) }))
vi.mock("../folder/ButtonMenuFolder", () => ({ ButtonMenuFolder: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("../note/ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

beforeAll(() => {
    // jsdom has no layout: give every element a 600px viewport
    Element.prototype.getBoundingClientRect = () => ({ width: 200, height: 600, top: 0, left: 0, right: 200, bottom: 600, x: 0, y: 0, toJSON: () => ({}) })
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 })
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 200 })
})

describe("VirtualTree", () => {
    it("renders only the rows near the viewport", () => {
        const notes = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, name: `Nota ${i + 1}`, color: "#000000" }) as unknown as Note)
        const rows = flattenTree({ rootFolders: [], rootNotes: notes }, new Set())
        const scroller = document.createElement("div")
        document.body.appendChild(scroller)
        render(
            <DndContext>
                <VirtualTree
                    rows={rows}
                    collapsedIds={new Set()}
                    onToggleFolder={() => { }}
                    overKey={null}
                    overZone={null}
                    activeKey="note-400"
                    getScrollElement={() => scroller}
                />
            </DndContext>,
        )
        const rendered = screen.getAllByTestId("tree-row").length
        expect(rendered).toBeGreaterThan(0)
        expect(rendered).toBeLessThan(100)
        // The dragged row stays mounted although far outside the viewport
        expect(screen.getByText("Nota 400")).toBeTruthy()
    })
})
