import { createRef } from "react"
import { render } from "@testing-library/react"
import { DndContext } from "@dnd-kit/core"
import { beforeAll, describe, expect, it, vi } from "vitest"
import type { Note } from "@/types/types"
import { flattenTree } from "./flat-tree"
import { VirtualTree, type VirtualTreeHandle } from "./VirtualTree"

const scrollToIndex = vi.fn()

// Keeps the real virtualizer but spies on its scrolling
vi.mock("@tanstack/react-virtual", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-virtual")>()
    return {
        ...actual,
        useVirtualizer: (options: Parameters<typeof actual.useVirtualizer>[0]) => {
            const virtualizer = actual.useVirtualizer(options)
            virtualizer.scrollToIndex = scrollToIndex
            return virtualizer
        },
    }
})
vi.mock("@/hooks/use-inline-rename", () => ({
    useInlineRename: () => ({ editing: false, error: null, start: () => {}, inputProps: {} }),
}))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ sidebarItemSize: "normal" }) }))
vi.mock("@/contexts/use-tabs", () => ({ useTabsActions: () => ({ openNote: vi.fn() }), useActiveNoteId: () => null, useActiveNoteSelector: (select: (id: number | null) => unknown) => select(null) }))
vi.mock("../note/ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

beforeAll(() => {
    // jsdom has no layout: give every element a 600px viewport
    Element.prototype.getBoundingClientRect = () => ({ width: 200, height: 600, top: 0, left: 0, right: 200, bottom: 600, x: 0, y: 0, toJSON: () => ({}) })
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 })
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 200 })
})

describe("VirtualTree handle", () => {
    it("scrolls to the index of a row by key, and reports a key that is not a row", () => {
        const notes = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, name: `Nota ${i + 1}`, color: "#000000" }) as unknown as Note)
        const rows = flattenTree({ rootFolders: [], rootNotes: notes }, new Set())
        const scroller = document.createElement("div")
        document.body.appendChild(scroller)
        const handle = createRef<VirtualTreeHandle>()
        render(
            <DndContext>
                <VirtualTree rows={rows} collapsedIds={new Set()} onToggleFolder={() => { }} activeKey={null} getScrollElement={() => scroller} handleRef={handle} />
            </DndContext>,
        )

        expect(handle.current?.scrollToKey("note-250")).toBe(true)
        expect(scrollToIndex).toHaveBeenCalledWith(249, { align: "auto" })

        scrollToIndex.mockClear()
        expect(handle.current?.scrollToKey("note-9999")).toBe(false)
        expect(scrollToIndex).not.toHaveBeenCalled()
    })
})
