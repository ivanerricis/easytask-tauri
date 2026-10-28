import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LayoutContext } from "@/contexts/layout-context-object"
import { SplitHarness } from "@/test/split-harness"
import type { SplitState } from "@/test/split-fixtures"
import { CenterContainer } from "./CenterContainer"
import { getSplitRatio, saveSplitRatio } from "@/lib/store/split"

vi.mock("./note/NoteList", () => ({ NoteList: () => <div data-testid="note-list" /> }))
vi.mock("./groups/GroupContainer", () => ({ GroupContainer: () => <div data-testid="groups" /> }))
vi.mock("./PathBar", () => ({ PathBar: () => <div data-testid="path-bar" /> }))
vi.mock("./BlankNote", () => ({ BlankNote: () => <div data-testid="blank" /> }))
vi.mock("./note/TabsDndProvider", () => ({ TabsDndProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-dnd">{children}</div> }))
vi.mock("./note-search-context", () => ({ NoteSearchProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/lib/store/split", () => ({ getSplitRatio: vi.fn(), saveSplitRatio: vi.fn() }))

const tabs = { openIds: [1], activeId: 1 }
const layout = (isSplit: boolean) => ({ left: tabs, right: isSplit ? { openIds: [], activeId: null } : null, focused: 0 as const, isSplit })
const state: SplitState = { open0: [1], active0: 1, open1: [], active1: null, focused: 0 }

describe("CenterContainer", () => {
    beforeEach(() => {
        vi.mocked(getSplitRatio).mockReset().mockResolvedValue(0.5)
        vi.mocked(saveSplitRatio).mockReset().mockResolvedValue(undefined)
    })

    it("renders the blank note without tabs and outside any layout", () => {
        render(<CenterContainer />)
        expect(screen.queryByTestId("note-list")).not.toBeInTheDocument()
        expect(screen.getByTestId("blank")).toBeInTheDocument()
        expect(screen.queryByRole("region")).not.toBeInTheDocument()
    })

    it("renders the note list, the path bar and the groups with no divider when not split", () => {
        render(
            <LayoutContext.Provider value={layout(false)}>
                <SplitHarness state={state}><CenterContainer /></SplitHarness>
            </LayoutContext.Provider>,
        )
        expect(screen.getByTestId("note-list")).toBeInTheDocument()
        expect(screen.getByTestId("path-bar")).toBeInTheDocument()
        expect(screen.getByTestId("groups")).toBeInTheDocument()
        expect(screen.queryByRole("separator")).not.toBeInTheDocument()
        expect(screen.queryByTestId("tabs-dnd")).not.toBeInTheDocument()
        expect(getSplitRatio).not.toHaveBeenCalled()
    })

    it("renders two panes and a divider inside the tabs drag and drop context when split", async () => {
        render(
            <LayoutContext.Provider value={layout(true)}>
                <SplitHarness state={state}><CenterContainer /></SplitHarness>
            </LayoutContext.Provider>,
        )
        const tabsDnd = screen.getByTestId("tabs-dnd")
        expect(tabsDnd).toContainElement(screen.getByRole("separator"))
        expect(screen.getByRole("region", { name: "Area sinistra" })).toContainElement(screen.getByTestId("groups"))
        expect(screen.getByRole("region", { name: "Area destra" })).toContainElement(screen.getByText("Area vuota"))
        await waitFor(() => expect(getSplitRatio).toHaveBeenCalled())
    })

    it("applies the saved ratio and saves a new one when the divider moves", async () => {
        vi.mocked(getSplitRatio).mockResolvedValue(0.4)
        render(
            <LayoutContext.Provider value={layout(true)}>
                <SplitHarness state={state}><CenterContainer /></SplitHarness>
            </LayoutContext.Provider>,
        )
        const separator = screen.getByRole("separator")
        await waitFor(() => expect(separator).toHaveAttribute("aria-valuenow", "40"))
        expect(screen.getByRole("region", { name: "Area sinistra" }).style.flexBasis).toBe("40%")
        separator.focus()
        const { fireEvent } = await import("@testing-library/react")
        fireEvent.keyDown(separator, { key: "ArrowRight" })
        expect(separator).toHaveAttribute("aria-valuenow", "42")
        expect(saveSplitRatio).toHaveBeenCalledWith(0.42)
    })
})
