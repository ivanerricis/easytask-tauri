import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ButtonMenuGroup } from "./ButtonMenuGroup"
import { makeGroup } from "@/test/ui-fixtures"

const patchGroup = vi.fn()
const removeGroup = vi.fn()
vi.mock("@/contexts/use-active-note", () => ({ useActiveNoteActions: () => ({ patchGroup, removeGroup }) }))
vi.mock("@/contexts/use-audio", () => ({ useAudio: () => ({ addFiles: vi.fn() }) }))
vi.mock("@/components/dialogs/dialog-delete", () => ({
    DialogDeleteItem: ({ isOpen, optimistic }: { isOpen: boolean, optimistic: () => () => void }) =>
        isOpen ? <button onClick={() => optimistic()}>Dialog elimina</button> : null,
}))
vi.mock("@/components/dialogs/dialog-rename", () => ({
    DialogRenameItem: ({ isOpen, optimistic }: { isOpen: boolean, optimistic: (name: string) => () => void }) =>
        isOpen ? (
            <>
                <button onClick={() => optimistic("Nuovo")}>Dialog rinomina</button>
                <button onClick={() => optimistic("")}>Svuota nome</button>
            </>
        ) : null,
}))

beforeEach(() => vi.clearAllMocks())

const setup = () => {
    render(
        <ButtonMenuGroup group={makeGroup({ id: 3 })}>
            <div data-testid="row">Gruppo</div>
        </ButtonMenuGroup>,
    )
    return screen.getByTestId("row")
}

describe("ButtonMenuGroup", () => {
    it("renames through the cached note tree, clearing the name when it is empty", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Rinomina"))
        await user.click(await screen.findByText("Dialog rinomina"))
        expect(patchGroup).toHaveBeenCalledWith(3, { name: "Nuovo" })
        await user.click(await screen.findByText("Svuota nome"))
        expect(patchGroup).toHaveBeenCalledWith(3, { name: null })
    })

    it("removes the group through the cached note tree", async () => {
        const user = userEvent.setup()
        const row = setup()
        fireEvent.contextMenu(row)
        await user.click(await screen.findByText("Elimina"))
        await user.click(await screen.findByText("Dialog elimina"))
        expect(removeGroup).toHaveBeenCalledWith(3)
    })
})
