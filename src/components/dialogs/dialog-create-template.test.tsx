import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { DialogCreateTemplate } from "./dialog-create-template"

const data = { createTemplateFromNote: vi.fn() }
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceActions: () => data }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const note = { id: 9, name: "Sprint 12" }

describe("DialogCreateTemplate", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        data.createTemplateFromNote.mockResolvedValue(3)
    })

    it("defaults the name to the note name, creates the template and closes", async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        render(<DialogCreateTemplate note={note} isOpen onOpenChange={onOpenChange} />)
        const input = screen.getByLabelText("Nome del template")
        expect(input).toHaveValue("Sprint 12")

        await user.clear(input)
        await user.type(input, "Sprint tipo")
        await user.click(screen.getByRole("button", { name: "Crea template" }))

        await waitFor(() => expect(data.createTemplateFromNote).toHaveBeenCalledWith(9, "Sprint tipo"))
        expect(toast.success).toHaveBeenCalledWith("Template creato")
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it("shows the error of a name clash and stays open", async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        data.createTemplateFromNote.mockRejectedValue({ code: "TEMPLATE_EXISTS", message: "Esiste già un template con questo nome." })
        render(<DialogCreateTemplate note={note} isOpen onOpenChange={onOpenChange} />)
        await user.click(screen.getByRole("button", { name: "Crea template" }))

        expect(await screen.findByText("Esiste già un template con questo nome.")).toBeInTheDocument()
        expect(toast.success).not.toHaveBeenCalled()
        expect(onOpenChange).not.toHaveBeenCalled()
    })

    it("disables the button for an empty name and renders nothing when closed", async () => {
        const user = userEvent.setup()
        const { rerender } = render(<DialogCreateTemplate note={note} isOpen onOpenChange={vi.fn()} />)
        await user.clear(screen.getByLabelText("Nome del template"))
        expect(screen.getByRole("button", { name: "Crea template" })).toBeDisabled()

        rerender(<DialogCreateTemplate note={note} isOpen={false} onOpenChange={vi.fn()} />)
        expect(screen.queryByLabelText("Nome del template")).not.toBeInTheDocument()
    })

    it("starts again from the note name when reopened", async () => {
        const user = userEvent.setup()
        const { rerender } = render(<DialogCreateTemplate note={note} isOpen onOpenChange={vi.fn()} />)
        await user.type(screen.getByLabelText("Nome del template"), " extra")
        rerender(<DialogCreateTemplate note={note} isOpen={false} onOpenChange={vi.fn()} />)
        rerender(<DialogCreateTemplate note={note} isOpen onOpenChange={vi.fn()} />)
        expect(screen.getByLabelText("Nome del template")).toHaveValue("Sprint 12")
    })
})
