import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import { ButtonTemplates } from "./ButtonTemplates"
import { makeWorkspace } from "@/test/ui-fixtures"

const data = {
    countTemplates: vi.fn(),
    templatesVersion: 0,
}
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceData: () => data }))
vi.mock("@/contexts/workspace-context", () => ({ useWorkspace: () => ({ currentWorkspace: makeWorkspace({ id: 4 }) }) }))
vi.mock("@/components/dialogs/dialog-templates", () => ({
    DialogTemplates: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Dialog template</div> : null,
}))

// Simulates a template created elsewhere: templatesVersion is bumped
const Harness = () => {
    const [, setTick] = useState(0)
    return (
        <>
            <button onClick={() => { data.templatesVersion += 1; setTick(t => t + 1) }}>simulate-create</button>
            <ButtonTemplates />
        </>
    )
}

describe("ButtonTemplates", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        data.templatesVersion = 0
    })

    it("shows the number of templates and opens the dialog", async () => {
        const user = userEvent.setup()
        data.countTemplates.mockResolvedValue(3)
        render(<ButtonTemplates />)
        expect(await screen.findByLabelText("3 template")).toBeInTheDocument()
        expect(data.countTemplates).toHaveBeenCalledWith(4)

        await user.click(screen.getByRole("button", { name: /Template/ }))
        expect(await screen.findByText("Dialog template")).toBeInTheDocument()
    })

    it("shows no badge without templates and refreshes it when templatesVersion changes", async () => {
        const user = userEvent.setup()
        data.countTemplates.mockResolvedValueOnce(0).mockResolvedValue(1)
        render(<Harness />)
        await waitFor(() => expect(data.countTemplates).toHaveBeenCalledTimes(1))
        expect(screen.queryByLabelText(/template$/)).not.toBeInTheDocument()

        await user.click(screen.getByText("simulate-create"))
        expect(await screen.findByLabelText("1 template")).toBeInTheDocument()
    })
})
