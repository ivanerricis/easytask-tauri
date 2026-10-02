import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Trash2, FolderSearch } from "lucide-react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfirmDialog } from "./dialog-confirm"

const onOpenChange = vi.fn()
const onConfirm = vi.fn()
const onSecondary = vi.fn()

const setup = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) =>
    render(
        <ConfirmDialog
            open
            onOpenChange={onOpenChange}
            title="Spostare nel cestino?"
            description="Potrai ripristinarlo in seguito."
            confirm={{ label: "Sposta nel cestino", icon: Trash2, onClick: onConfirm }}
            {...props}
        />,
    )

beforeEach(() => {
    vi.clearAllMocks()
})

describe("ConfirmDialog", () => {
    it("shows the title, the description, the extra content and a close button", () => {
        setup({ children: <p>C:\Musica\brano.mp3</p> })
        const dialog = screen.getByRole("dialog")
        expect(dialog).toHaveTextContent("Spostare nel cestino?")
        expect(dialog).toHaveTextContent("Potrai ripristinarlo in seguito.")
        expect(screen.getByText("C:\\Musica\\brano.mp3")).toBeInTheDocument()
        // The same X as every other dialog of the app (an AlertDialog has none)
        expect(screen.getByRole("button", { name: "Chiudi" })).toBeInTheDocument()
    })

    it("puts Annulla on the left and the main action, with its icon, on the right", () => {
        setup()
        const buttons = screen.getAllByRole("button").filter(b => b.textContent !== "Chiudi")
        expect(buttons.map(b => b.textContent)).toEqual(["Annulla", "Sposta nel cestino"])
        expect(buttons[1].querySelector("svg.lucide-trash-2")).not.toBeNull()
        expect(buttons[0].querySelector("svg")).toBeNull()
    })

    it("is neutral by default and red when the action loses data", () => {
        const { rerender } = setup()
        expect(screen.getByRole("heading", { name: "Spostare nel cestino?" })).not.toHaveClass("text-destructive")
        expect(screen.getByRole("button", { name: "Sposta nel cestino" })).not.toHaveClass("text-destructive")

        rerender(
            <ConfirmDialog open onOpenChange={onOpenChange} title="Spostare nel cestino?" destructive
                confirm={{ label: "Sposta nel cestino", icon: Trash2, onClick: onConfirm }} />,
        )
        expect(screen.getByRole("heading", { name: "Spostare nel cestino?" })).toHaveClass("text-destructive")
        expect(screen.getByRole("button", { name: "Sposta nel cestino" })).toHaveClass("text-destructive")
    })

    it("closes and runs the action when the main button is clicked", async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("leaves the closing to the action when autoClose is off", async () => {
        const user = userEvent.setup()
        setup({ autoClose: false })
        await user.click(screen.getByRole("button", { name: "Sposta nel cestino" }))
        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it("Annulla closes without running anything", async () => {
        const user = userEvent.setup()
        setup()
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        expect(onOpenChange).toHaveBeenCalledWith(false)
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("offers a second action between Annulla and the main one", async () => {
        const user = userEvent.setup()
        setup({
            secondary: { label: "Elimina riferimento", icon: Trash2, onClick: onSecondary },
            secondaryDestructive: true,
            confirm: { label: "Aggiorna percorso", icon: FolderSearch, onClick: onConfirm },
        })
        const buttons = screen.getAllByRole("button").filter(b => b.textContent !== "Chiudi")
        expect(buttons.map(b => b.textContent)).toEqual(["Annulla", "Elimina riferimento", "Aggiorna percorso"])
        expect(buttons[1]).toHaveClass("text-destructive")

        await user.click(buttons[1])
        expect(onSecondary).toHaveBeenCalledTimes(1)
        expect(onConfirm).not.toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    describe("keyboard", () => {
        it("starts with the focus on the main action, so that Enter does what it says", async () => {
            setup()
            await waitFor(() => expect(screen.getByRole("button", { name: "Sposta nel cestino" })).toHaveFocus())
        })

        it("can start on Annulla for what cannot be undone", async () => {
            setup({ initialFocus: "cancel" })
            await waitFor(() => expect(screen.getByRole("button", { name: "Annulla" })).toHaveFocus())
        })

        it("Enter confirms when the focus is not on a button", () => {
            setup()
            fireEvent.keyDown(screen.getByRole("dialog"), { key: "Enter" })
            expect(onConfirm).toHaveBeenCalledTimes(1)
            expect(onOpenChange).toHaveBeenCalledWith(false)
        })

        it("Enter on Annulla does not confirm (it presses Annulla)", () => {
            setup()
            fireEvent.keyDown(screen.getByRole("button", { name: "Annulla" }), { key: "Enter" })
            expect(onConfirm).not.toHaveBeenCalled()
        })
    })

    it("does not let the clicks reach the elements around it (a row, a menu)", async () => {
        const user = userEvent.setup()
        const onParentClick = vi.fn()
        render(
            <div onClick={onParentClick}>
                <ConfirmDialog open onOpenChange={onOpenChange} title="Elimina" confirm={{ label: "Elimina", onClick: onConfirm }} />
            </div>,
        )
        await user.click(screen.getByRole("button", { name: "Elimina" }))
        await user.click(screen.getByRole("button", { name: "Annulla" }))
        expect(onParentClick).not.toHaveBeenCalled()
    })
})
