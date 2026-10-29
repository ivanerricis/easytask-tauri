import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toastMock } from "@/test/mocks"

const clipboard = vi.hoisted(() => ({ writeText: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@tauri-apps/plugin-clipboard-manager", () => clipboard)
vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())
vi.mock("@/contexts/use-workspace", () => ({ useWorkspace: () => ({ resetWorkspace: vi.fn() }) }))
vi.mock("@/contexts/workspace-data", () => ({ useWorkspaceData: () => ({ resetData: vi.fn() }) }))

import { ErrorPage } from "./error-page"

const renderPage = (props: Parameters<typeof ErrorPage>[0]) => render(<MemoryRouter><ErrorPage {...props} /></MemoryRouter>)

describe("ErrorPage", () => {
    beforeEach(() => {
        clipboard.writeText.mockClear()
        toastMock.success.mockClear()
    })

    it("shows a translated message with the raw one in the technical details", async () => {
        renderPage({ error: "db unavailable" })
        expect(screen.getByText(/L'operazione non è riuscita/)).toBeInTheDocument()
        expect(screen.queryByText("db unavailable")).not.toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: "Dettagli tecnici" }))
        expect(screen.getByText("db unavailable")).toBeVisible()
    })

    it("copies the details of the error", async () => {
        renderPage({ error: "db unavailable" })
        await userEvent.click(screen.getByRole("button", { name: "Copia dettagli" }))
        expect(clipboard.writeText).toHaveBeenCalledWith("db unavailable")
        expect(toastMock.success).toHaveBeenCalled()
    })

    it("has no details nor copy button without an error", () => {
        renderPage({ error: null })
        expect(screen.queryByRole("button", { name: "Copia dettagli" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Dettagli tecnici" })).not.toBeInTheDocument()
    })

    it("focuses the first button: Try again when it is offered, else Back to home", () => {
        const { unmount } = renderPage({ error: "x", onRetry: vi.fn() })
        expect(screen.getByRole("button", { name: "Riprova" })).toHaveFocus()
        unmount()
        renderPage({ error: "x" })
        expect(screen.getByRole("button", { name: "Torna alla home" })).toHaveFocus()
    })
})
