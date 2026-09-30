import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { ButtonTrash } from "./ButtonTrash"
import { makeWorkspace } from "@/test/ui-fixtures"

const data = {
    workspaceDataTree: null,
    getTrash: vi.fn(),
    trashVersion: 0,
}
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceData: () => data }))
vi.mock("@/contexts/workspace-context", () => ({ useWorkspace: () => ({ currentWorkspace: makeWorkspace({ id: 4 }) }) }))
vi.mock("@/components/dialogs/dialog-trash", () => ({ DialogTrash: () => null }))

// Simulates a delete elsewhere in the app: the trash grows and trashVersion is bumped
const Harness = () => {
    const [, setTick] = useState(0)
    return (
        <>
            <button onClick={() => { data.trashVersion += 1; setTick(t => t + 1) }}>simulate-delete</button>
            <ButtonTrash />
        </>
    )
}

describe("ButtonTrash", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        data.trashVersion = 0
    })

    it("shows the number of trashed items", async () => {
        data.getTrash.mockResolvedValue([{ id: 1 }, { id: 2 }])
        render(<ButtonTrash />)
        expect(await screen.findByLabelText("2 elementi nel cestino")).toBeInTheDocument()
        expect(data.getTrash).toHaveBeenCalledWith(4)
    })

    it("refreshes the badge when trashVersion changes (e.g. after deleting a task)", async () => {
        const user = userEvent.setup()
        data.getTrash.mockResolvedValueOnce([]).mockResolvedValue([{ id: 1 }])
        render(<Harness />)
        await waitFor(() => expect(data.getTrash).toHaveBeenCalledTimes(1))
        expect(screen.queryByLabelText(/elementi nel cestino/)).not.toBeInTheDocument()

        await user.click(screen.getByText("simulate-delete"))
        expect(await screen.findByLabelText("1 elementi nel cestino")).toBeInTheDocument()
        expect(data.getTrash).toHaveBeenCalledTimes(2)
    })
})
