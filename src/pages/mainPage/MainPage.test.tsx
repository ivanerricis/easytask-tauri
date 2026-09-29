import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import MainPage from "./MainPage"
import { makeWorkspace } from "@/test/ui-fixtures"

const ctx = {
    workspaces: [] as ReturnType<typeof makeWorkspace>[],
    getWorkspaces: vi.fn(),
    isLoading: false,
    error: null as string | null,
}
vi.mock("@/contexts/workspace-context", () => ({ useWorkspace: () => ctx }))
vi.mock("./MainPageLayout", () => ({ MainPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock("./components/DialogCreateWorkspace", () => ({ DialogCreateWorkspace: () => <div>create-dialog</div> }))
vi.mock("./components/WorkspacesContainer", () => ({
    WorkspacesContainer: ({ workspaces }: { workspaces: { name: string }[] }) => (
        <ul>{workspaces.map(w => <li key={w.name}>{w.name}</li>)}</ul>
    ),
}))
vi.mock("@/components/pages/error-page", () => ({ ErrorPage: ({ error }: { error: string }) => <div>error:{error}</div> }))

describe("MainPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        ctx.workspaces = []
        ctx.isLoading = false
        ctx.error = null
        ctx.getWorkspaces.mockResolvedValue(undefined)
    })

    it("requests the workspaces on mount", () => {
        render(<MainPage />)
        expect(ctx.getWorkspaces).toHaveBeenCalledTimes(1)
    })

    it("shows the loading page during the initial load", () => {
        ctx.isLoading = true
        render(<MainPage />)
        expect(screen.getByText("Caricamento dei Workspace...")).toBeInTheDocument()
        expect(screen.queryByText("Bentornato!")).not.toBeInTheDocument()
    })

    it("keeps showing the list while refreshing when workspaces already exist", () => {
        ctx.isLoading = true
        ctx.workspaces = [makeWorkspace({ name: "Alpha" })]
        render(<MainPage />)
        expect(screen.getByText("Alpha")).toBeInTheDocument()
        expect(screen.queryByText("Caricamento dei Workspace...")).not.toBeInTheDocument()
        expect(screen.getByRole("button")).toBeDisabled()
    })

    it("shows the error page when loading failed and nothing is cached", () => {
        ctx.error = "db unavailable"
        render(<MainPage />)
        expect(screen.getByText("error:db unavailable")).toBeInTheDocument()
    })

    it("shows the workspaces instead of the error when some are available", () => {
        ctx.error = "stale"
        ctx.workspaces = [makeWorkspace({ name: "Beta" })]
        render(<MainPage />)
        expect(screen.getByText("Beta")).toBeInTheDocument()
        expect(screen.queryByText(/error:/)).not.toBeInTheDocument()
    })

    it("reloads on refresh click and swallows rejections", async () => {
        const user = userEvent.setup()
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        render(<MainPage />)
        ctx.getWorkspaces.mockRejectedValueOnce(new Error("fail"))

        await user.click(screen.getByRole("button"))

        await waitFor(() => expect(ctx.getWorkspaces).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(spy).toHaveBeenCalled())
    })
})
