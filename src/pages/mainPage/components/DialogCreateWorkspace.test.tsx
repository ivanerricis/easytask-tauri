import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DialogCreateWorkspace } from "./DialogCreateWorkspace"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { deferred } from "@/test/ui-render"

const ctx = { createWorkspace: vi.fn(), getWorkspaces: vi.fn() }
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ctx }))

const open = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button"))
    return screen.getByRole("textbox")
}

describe("DialogCreateWorkspace", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.getWorkspaces.mockResolvedValue(undefined)
    })

    it("labels the name input and keeps submit disabled for a blank name", async () => {
        const user = userEvent.setup()
        render(<DialogCreateWorkspace />, { wrapper: ShortcutsProvider })
        const input = await open(user)
        expect(input).toHaveAccessibleName()

        await user.type(input, "   ")
        const submit = screen.getAllByRole("button").find(b => b.getAttribute("type") === "submit")!
        expect(submit).toBeDisabled()
    })

    it("creates the workspace once when Enter is pressed twice", async () => {
        const user = userEvent.setup()
        const pending = deferred()
        ctx.createWorkspace.mockReturnValue(pending.promise)
        render(<DialogCreateWorkspace />, { wrapper: ShortcutsProvider })
        const input = await open(user)
        await user.type(input, "Work{Enter}{Enter}")

        expect(ctx.createWorkspace).toHaveBeenCalledTimes(1)
        pending.resolve()
        await waitFor(() => expect(ctx.getWorkspaces).toHaveBeenCalledTimes(1))
    })
})
