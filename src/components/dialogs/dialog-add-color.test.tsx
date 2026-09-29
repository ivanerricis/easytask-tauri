import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { DialogAddColor } from "./dialog-add-color"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const setup = (over: Partial<Parameters<typeof DialogAddColor>[0]> = {}) => {
    const addColorItem = vi.fn().mockResolvedValue(undefined)
    const getItemData = vi.fn().mockResolvedValue(undefined)
    const setDropDownOpen = vi.fn()
    const utils = render(
        <DialogAddColor
            item={{ id: 4, color: "#111111" }}
            itemType="section"
            getItemId={2}
            addColorItem={addColorItem}
            getItemData={getItemData}
            setDropDownOpen={setDropDownOpen}
            {...over}
        />
    )
    return { addColorItem, getItemData, setDropDownOpen, ...utils }
}

describe("DialogAddColor", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("saves the clicked swatch, closes the dropdown and refreshes", async () => {
        const user = userEvent.setup()
        const { addColorItem, getItemData, setDropDownOpen } = setup()
        await user.click(screen.getAllByRole("button")[0])

        await waitFor(() => expect(getItemData).toHaveBeenCalledWith(2))
        expect(addColorItem).toHaveBeenCalledWith("section", 4, "#e6194b")
        expect(setDropDownOpen).toHaveBeenCalledWith(false)
    })

    it("does not save when the clicked color equals the current one", async () => {
        const user = userEvent.setup()
        const { addColorItem } = setup({ item: { id: 4, color: "#e6194b" } })
        await user.click(screen.getAllByRole("button")[0])

        expect(addColorItem).not.toHaveBeenCalled()
    })

    it("does not save without getItemId", async () => {
        const user = userEvent.setup()
        const { addColorItem } = setup({ getItemId: undefined })
        await user.click(screen.getAllByRole("button")[0])
        expect(addColorItem).not.toHaveBeenCalled()
    })

    it("saves the color chosen with the custom picker", async () => {
        const { addColorItem, container } = setup()
        const picker = container.querySelector("input[type=color]") as HTMLInputElement
        fireEvent.change(picker, { target: { value: "#00ff00" } })

        await waitFor(() => expect(addColorItem).toHaveBeenCalledWith("section", 4, "#00ff00"))
    })

    it("removes the color when Elimina is clicked", async () => {
        const user = userEvent.setup()
        const { addColorItem, getItemData } = setup()
        await user.click(screen.getByRole("button", { name: /Elimina/ }))

        await waitFor(() => expect(getItemData).toHaveBeenCalledWith(2))
        expect(addColorItem).toHaveBeenCalledWith("section", 4)
    })

    it("does nothing on Elimina if the item has no color", async () => {
        const user = userEvent.setup()
        const { addColorItem } = setup({ item: { id: 4, color: null } })
        await user.click(screen.getByRole("button", { name: /Elimina/ }))
        expect(addColorItem).not.toHaveBeenCalled()
    })

    it("reports failures with a toast", async () => {
        const user = userEvent.setup()
        const { addColorItem } = setup()
        addColorItem.mockRejectedValue(new Error("write failed"))
        await user.click(screen.getAllByRole("button")[1])

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("write failed"))
    })
})
