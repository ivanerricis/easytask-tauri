import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ItemMenu } from "./item-menu"
import { MenuItem } from "./menu-kind"
import { useItemMenuState } from "@/hooks/use-item-menu-state"

const Row = () => {
    const state = useItemMenuState()
    return (
        <ItemMenu state={state} items={<MenuItem>Voce</MenuItem>}>
            <div data-testid="row"><textarea aria-label="testo" readOnly defaultValue="x" /></div>
        </ItemMenu>
    )
}

describe("ItemMenu", () => {
    it("marks its row as the owner of the right click, so the text menu stays out of its read-only text", () => {
        render(<Row />)
        expect(screen.getByTestId("row")).toHaveAttribute("data-contextmenu")
    })

    it("opens its entries with a right click", async () => {
        render(<Row />)
        fireEvent.contextMenu(screen.getByTestId("row"))
        expect(await screen.findByRole("menuitem", { name: "Voce" })).toBeInTheDocument()
    })
})
