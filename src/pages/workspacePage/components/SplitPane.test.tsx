import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PaneProvider } from "@/contexts/pane-provider"
import { LayoutActionsContext } from "@/contexts/layout-context-object"
import type { PaneIndex } from "@/contexts/layout-reducer"
import { SplitHarness } from "@/test/split-harness"
import type { SplitState } from "@/test/split-fixtures"
import { SplitPane } from "./SplitPane"

vi.mock("./note/NoteList", () => ({ NoteList: () => <div data-testid="note-list" /> }))
vi.mock("./groups/GroupContainer", () => ({ GroupContainer: () => <div data-testid="groups" /> }))
vi.mock("./PathBar", () => ({ PathBar: () => <div data-testid="path-bar" /> }))
vi.mock("./note-search-context", () => ({ NoteSearchProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const state: SplitState = { open0: [1], active0: 1, open1: [], active1: null, focused: 0 }

const setup = (pane: PaneIndex, s: SplitState = state) => {
    const focusPane = vi.fn()
    render(
        <LayoutActionsContext.Provider value={{ split: vi.fn(), unsplit: vi.fn(), toggleSplit: vi.fn(), focusPane, openInPane: vi.fn(), moveToPane: vi.fn(), getLayout: () => ({ left: { openIds: [], activeId: null }, right: null, focused: 0, isSplit: false }) }}>
            <SplitHarness state={s}>
                <PaneProvider pane={pane}><SplitPane pane={pane} share={0.4} /></PaneProvider>
            </SplitHarness>
        </LayoutActionsContext.Provider>,
    )
    return { focusPane, region: screen.getByRole("region") }
}

describe("SplitPane", () => {
    it("shows the tab bar, the path bar and the groups of the active note", () => {
        const { region } = setup(0)
        expect(region).toHaveAccessibleName("Area sinistra")
        expect(region).toHaveAttribute("data-pane", "0")
        expect(region).toHaveAttribute("data-focused", "true")
        expect(region.className).toContain("border-t-primary")
        expect(region.style.flexBasis).toBe("40%")
        expect(screen.getByTestId("note-list")).toBeInTheDocument()
        expect(screen.getByTestId("path-bar")).toBeInTheDocument()
        expect(screen.getByTestId("groups")).toBeInTheDocument()
    })

    it("shows the empty placeholder, with the tab bar, when the pane has no note", () => {
        const { region } = setup(1)
        expect(region).toHaveAccessibleName("Area destra")
        expect(region).toHaveAttribute("data-focused", "false")
        expect(region.className).not.toContain("border-t-primary")
        expect(screen.getByTestId("note-list")).toBeInTheDocument()
        expect(screen.queryByTestId("groups")).not.toBeInTheDocument()
        expect(screen.getByText("Area vuota")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Chiudi la divisione" })).toBeInTheDocument()
    })

    it("takes the focus on pointer down and on focus when it does not have it", () => {
        const { focusPane, region } = setup(1)
        fireEvent.pointerDown(region)
        expect(focusPane).toHaveBeenCalledWith(1)
        focusPane.mockClear()
        fireEvent.focusIn(screen.getByRole("button", { name: "Chiudi la divisione" }))
        expect(focusPane).toHaveBeenCalledWith(1)
    })

    it("does not ask for the focus when it already has it", () => {
        const { focusPane, region } = setup(0)
        fireEvent.pointerDown(region)
        fireEvent.focusIn(region)
        expect(focusPane).not.toHaveBeenCalled()
    })
})
