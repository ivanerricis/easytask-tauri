import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { ButtonTrash } from "./ButtonTrash"
import { makeWorkspace } from "@/test/ui-fixtures"

const data = {
    getTrashCount: vi.fn(),
    trashVersion: 0,
}
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceData: () => data }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ currentWorkspace: makeWorkspace({ id: 4 }) }) }))
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
        data.getTrashCount.mockResolvedValue(2)
        render(<ButtonTrash />)
        expect(await screen.findByLabelText("2 elementi nel cestino")).toBeInTheDocument()
        expect(data.getTrashCount).toHaveBeenCalledWith(4)
    })

    it("refreshes the badge when trashVersion changes (e.g. after deleting a task)", async () => {
        const user = userEvent.setup()
        data.getTrashCount.mockResolvedValueOnce(0).mockResolvedValue(1)
        render(<Harness />)
        await waitFor(() => expect(data.getTrashCount).toHaveBeenCalledTimes(1))
        expect(screen.queryByLabelText(/elementi nel cestino/)).not.toBeInTheDocument()

        await user.click(screen.getByText("simulate-delete"))
        expect(await screen.findByLabelText("1 elemento nel cestino")).toBeInTheDocument()
        expect(data.getTrashCount).toHaveBeenCalledTimes(2)
    })
})
