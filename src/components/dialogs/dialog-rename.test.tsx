import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DialogRenameItem } from "./dialog-rename"

const renameItem = vi.fn()
vi.mock("@/contexts/workspace-data", () => ({
    useWorkspaceData: () => ({ renameItem }),
}))

const setup = (over: Partial<Parameters<typeof DialogRenameItem>[0]> = {}) => {
    const onOpenChange = vi.fn()
    const getItemData = vi.fn().mockResolvedValue(undefined)
    render(
        <DialogRenameItem
            item={{ id: 5, name: "Old name" }}
            itemType="task"
            isOpen
            onOpenChange={onOpenChange}
            getItemData={getItemData}
            getItemId={9}
            {...over}
        />
    )
    return { onOpenChange, getItemData }
}

describe("DialogRenameItem", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        renameItem.mockResolvedValue(undefined)
    })

    it("prefills the input with the item name, falling back to title", () => {
        setup({ item: { id: 1, title: "A title" } })
        expect(screen.getByRole("textbox")).toHaveValue("A title")
    })

    it("allows clearing the input and typing a new value", async () => {
        const user = userEvent.setup()
        setup()
        const input = screen.getByRole("textbox")

        await user.clear(input)
        expect(input).toHaveValue("")
        expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled()

        await user.type(input, "Fresh")
        expect(input).toHaveValue("Fresh")
        expect(screen.getByRole("button", { name: "Salva" })).toBeEnabled()
    })

    it("renames with the trimmed value, refreshes data and closes", async () => {
        const user = userEvent.setup()
        const { onOpenChange, getItemData } = setup()
        const input = screen.getByRole("textbox")

        await user.clear(input)
        await user.type(input, "  New  ")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(renameItem).toHaveBeenCalledWith("task", 5, "New")
        expect(getItemData).toHaveBeenCalledWith(9)
    })

    it("does not call rename when the name is unchanged but still closes", async () => {
        const user = userEvent.setup()
        const { onOpenChange } = setup()
        await user.click(screen.getByRole("button", { name: "Salva" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(renameItem).not.toHaveBeenCalled()
    })

    it("does not refresh data when getItemId is missing", async () => {
        const user = userEvent.setup()
        const { onOpenChange, getItemData } = setup({ getItemId: undefined })
        await user.type(screen.getByRole("textbox"), "x")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(getItemData).not.toHaveBeenCalled()
    })

    it("shows the error and stays open when rename fails", async () => {
        const user = userEvent.setup()
        renameItem.mockRejectedValue(new Error("db locked"))
        const { onOpenChange } = setup()
        await user.type(screen.getByRole("textbox"), "x")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        expect(await screen.findByText("db locked")).toBeInTheDocument()
        expect(onOpenChange).not.toHaveBeenCalled()

        // Typing clears the error
        await user.type(screen.getByRole("textbox"), "y")
        expect(screen.queryByText("db locked")).not.toBeInTheDocument()
    })

    it("applies the optimistic hook before the write and needs no reload", async () => {
        const user = userEvent.setup()
        const rollback = vi.fn()
        const optimistic = vi.fn(() => rollback)
        renameItem.mockImplementation(async () => { expect(optimistic).toHaveBeenCalledWith("x") })
        const { onOpenChange } = setup({ getItemData: undefined, getItemId: undefined, optimistic })
        const input = screen.getByRole("textbox")
        await user.clear(input)
        await user.type(input, "x")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(renameItem).toHaveBeenCalledWith("task", 5, "x")
        expect(rollback).not.toHaveBeenCalled()
    })

    it("undoes the optimistic change when the rename fails", async () => {
        const user = userEvent.setup()
        const rollback = vi.fn()
        renameItem.mockRejectedValue(new Error("db locked"))
        setup({ optimistic: () => rollback })
        await user.type(screen.getByRole("textbox"), "x")
        await user.click(screen.getByRole("button", { name: "Salva" }))

        expect(await screen.findByText("db locked")).toBeInTheDocument()
        expect(rollback).toHaveBeenCalledTimes(1)
    })

    it("does not apply the optimistic hook when the name is unchanged", async () => {
        const user = userEvent.setup()
        const optimistic = vi.fn(() => vi.fn())
        const { onOpenChange } = setup({ optimistic })
        await user.click(screen.getByRole("button", { name: "Salva" }))
        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
        expect(optimistic).not.toHaveBeenCalled()
    })

    it("cancel closes without renaming", async () => {
        const user = userEvent.setup()
        const { onOpenChange } = setup()
        await user.type(screen.getByRole("textbox"), "zzz")
        await user.click(screen.getByRole("button", { name: "Annulla" }))

        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(renameItem).not.toHaveBeenCalled()
    })

    it("Escape closes without renaming and clears the typed value and the error for the next open", async () => {
        const user = userEvent.setup()
        renameItem.mockRejectedValue(new Error("boom"))
        const onOpenChange = vi.fn()
        const ui = (isOpen: boolean) => (
            <DialogRenameItem item={{ id: 5, name: "Old name" }} itemType="task" isOpen={isOpen} onOpenChange={onOpenChange} />
        )
        const { rerender } = render(ui(true))
        await user.type(screen.getByRole("textbox"), "zzz")
        await user.click(screen.getByRole("button", { name: "Salva" }))
        expect(await screen.findByText("boom")).toBeInTheDocument()
        renameItem.mockClear()

        await user.keyboard("{Escape}")
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(renameItem).not.toHaveBeenCalled()

        rerender(ui(false))
        rerender(ui(true))
        expect(screen.getByRole("textbox")).toHaveValue("Old name")
        expect(screen.queryByText("boom")).toBeNull()
    })
})
