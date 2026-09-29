import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WorkSpacePage from "./WorkSpacePage"
import { deferred } from "@/test/ui-render"
import { makeWorkspace } from "@/test/ui-fixtures"

const workspaceCtx = { currentWorkspace: null as ReturnType<typeof makeWorkspace> | null }
const dataCtx = { error: null as string | null, getWorkspaceData: vi.fn() }

vi.mock("@/contexts/workspace-context", () => ({ useWorkspace: () => workspaceCtx }))
vi.mock("@/contexts/workspace-data-context", () => ({ useWorkspaceData: () => dataCtx }))
vi.mock("./WorkSpacePageLayout", () => ({ WorkSpaceLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock("./components/MainContainer", () => ({ MainContainer: () => <div>main-container</div> }))
vi.mock("@/components/pages/error-page", () => ({ ErrorPage: ({ error }: { error: string }) => <div>error:{error}</div> }))

describe("WorkSpacePage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        workspaceCtx.currentWorkspace = makeWorkspace({ id: 4 })
        dataCtx.error = null
        dataCtx.getWorkspaceData.mockResolvedValue(undefined)
    })

    it("shows the loading page until the data is loaded, then the main container", async () => {
        const d = deferred()
        dataCtx.getWorkspaceData.mockReturnValue(d.promise)
        render(<WorkSpacePage />)

        expect(screen.getByText("Caricamento dati del Workspace...")).toBeInTheDocument()
        expect(dataCtx.getWorkspaceData).toHaveBeenCalledWith(4)

        d.resolve()
        expect(await screen.findByText("main-container")).toBeInTheDocument()
        expect(screen.queryByText("Caricamento dati del Workspace...")).not.toBeInTheDocument()
    })

    it("shows the error page when the context reports an error", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        dataCtx.getWorkspaceData.mockRejectedValue(new Error("load failed"))
        dataCtx.error = "Errore caricamento dati del Workspace"
        render(<WorkSpacePage />)

        expect(await screen.findByText("error:Errore caricamento dati del Workspace")).toBeInTheDocument()
        expect(screen.queryByText("main-container")).not.toBeInTheDocument()
        expect(spy).toHaveBeenCalled()
    })

    it("renders nothing once loaded when there is no current workspace", async () => {
        workspaceCtx.currentWorkspace = null
        const { container } = render(<WorkSpacePage />)

        await waitFor(() => expect(screen.queryByText("Caricamento dati del Workspace...")).not.toBeInTheDocument())
        expect(dataCtx.getWorkspaceData).not.toHaveBeenCalled()
        expect(container).toBeEmptyDOMElement()
    })
})
