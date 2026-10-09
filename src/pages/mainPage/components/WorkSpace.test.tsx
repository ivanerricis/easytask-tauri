import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Workspace } from "@/types/types"
import { WorkSpaceItem } from "./WorkSpace"

// The rename field needs the workspace data; the rows are tested without it
vi.mock("@/hooks/use-inline-rename", () => ({
    useInlineRename: () => ({ editing: false, error: null, start: () => {}, inputProps: {} }),
}))

const navigate = vi.fn()
const setCurrentWorkspace = vi.fn()

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }))
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ setCurrentWorkspace }) }))
vi.mock("./ButtonMenuWorkspace", () => ({ ButtonMenuWorkspace: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

const workspace = {
    id: 3, name: "Lavoro", color: null,
    creation_date: "2024-01-01", creation_time: "10:00", edit_date: "2024-01-02", edit_time: "11:00",
} as unknown as Workspace

describe.each(["grid", "list"] as const)("WorkSpaceItem (%s) keyboard", (view) => {
    it("opens the workspace with Enter on the card button", async () => {
        navigate.mockClear()
        render(<WorkSpaceItem workspace={workspace} view={view} />)
        screen.getByRole("button", { name: "Apri il workspace Lavoro" }).focus()
        await userEvent.keyboard("{Enter}")
        expect(setCurrentWorkspace).toHaveBeenCalledWith(workspace)
        expect(navigate).toHaveBeenCalledWith("/workspace/3")
    })
})
