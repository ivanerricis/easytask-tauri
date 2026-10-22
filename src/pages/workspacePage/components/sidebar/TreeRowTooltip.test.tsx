import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TooltipTrigger } from "@/components/ui/tooltip"
import { TreeRowTooltip } from "./TreeRowTooltip"
import { openOnKeyboardFocus } from "./tree-row"

const renderRow = () => {
    render(
        <TreeRowTooltip name="Nota lunga" creationDate="2026-01-02" creationTime="10:00" editDate="2026-01-03" editTime="11:00">
            <TooltipTrigger asChild onFocus={openOnKeyboardFocus}>
                <div role="treeitem" tabIndex={0} aria-label="Nota lunga" />
            </TooltipTrigger>
        </TreeRowTooltip>,
    )
    return screen.getByRole("treeitem")
}

describe("TreeRowTooltip focus", () => {
    afterEach(() => vi.restoreAllMocks())

    it("opens on a keyboard focus", async () => {
        renderRow()
        await userEvent.tab()
        expect(await screen.findByRole("tooltip")).toHaveTextContent("Nota lunga")
    })

    it("stays closed when a closing menu gives the focus back after a click (not focus-visible)", () => {
        // jsdom matches :focus-visible on every focus: the browser does not after a pointer interaction
        const matches = Element.prototype.matches
        vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
            return selector === ":focus-visible" ? false : matches.call(this, selector)
        })
        const row = renderRow()
        act(() => row.focus())
        expect(screen.queryByRole("tooltip")).toBeNull()
    })
})
