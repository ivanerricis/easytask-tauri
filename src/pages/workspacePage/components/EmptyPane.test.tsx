import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { LayoutActionsContext } from "@/contexts/layout-context-object"
import { EmptyPane } from "./EmptyPane"

const renderPane = (pane: 0 | 1) => {
    const unsplit = vi.fn()
    render(
        <LayoutActionsContext.Provider value={{ split: vi.fn(), unsplit, toggleSplit: vi.fn(), focusPane: vi.fn(), openInPane: vi.fn(), moveToPane: vi.fn() }}>
            <EmptyPane pane={pane} />
        </LayoutActionsContext.Provider>,
    )
    return unsplit
}

describe("EmptyPane", () => {
    it("explains how to fill the pane, without a close button on the left one", () => {
        renderPane(0)
        expect(screen.getByText("Area vuota")).toBeInTheDocument()
        expect(screen.getByText(/Apri a destra/)).toBeInTheDocument()
        expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("lets the right pane close the split", async () => {
        const unsplit = renderPane(1)
        await userEvent.click(screen.getByRole("button", { name: "Chiudi la divisione" }))
        expect(unsplit).toHaveBeenCalledTimes(1)
    })
})
