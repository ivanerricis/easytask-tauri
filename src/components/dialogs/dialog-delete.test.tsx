import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { DialogDeleteItem } from "./dialog-delete"

const deleteItem = vi.fn()
vi.mock("@/contexts/workspace-data-context", () => ({
    useWorkspaceData: () => ({ deleteItem }),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const setup = (over: Partial<Parameters<typeof DialogDeleteItem>[0]> = {}) => {
    const onOpenChange = vi.fn()
    const getItemData = vi.fn().mockResolvedValue(undefined)
    render(
        <DialogDeleteItem
            item={{ id: 3 }}
            itemType="note"
            isOpen
            onOpenChange={onOpenChange}
            getItemData={getItemData}
            getItemId={8}
            {...over}
        />
    )
    return { onOpenChange, getItemData }
}

describe("DialogDeleteItem", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        deleteItem.mockResolvedValue(undefined)
    })

    it("deletes the item, refreshes data and closes", async () => {
        const user = userEvent.setup()
        const { onOpenChange, getItemData } = setup()
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(deleteItem).toHaveBeenCalledWith("note", 3)
        expect(getItemData).toHaveBeenCalledWith(8)
    })

    it("deletes when pressing Enter", async () => {
        const user = userEvent.setup()
        const { onOpenChange } = setup()
        await user.keyboard("{Enter}")

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(deleteItem).toHaveBeenCalledTimes(1)
    })

    it("skips the refresh when getItemId is missing", async () => {
        const user = userEvent.setup()
        const { getItemData, onOpenChange } = setup({ getItemId: undefined })
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(getItemData).not.toHaveBeenCalled()
    })

    it("shows a toast and stays open when the delete fails", async () => {
        const user = userEvent.setup()
        deleteItem.mockRejectedValue(new Error("constraint"))
        const { onOpenChange } = setup()
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("constraint")))
        expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })

    it("cancel closes without deleting", async () => {
        const user = userEvent.setup()
        const { onOpenChange } = setup()
        await user.click(screen.getByRole("button", { name: "Annulla" }))

        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(deleteItem).not.toHaveBeenCalled()
    })
})
