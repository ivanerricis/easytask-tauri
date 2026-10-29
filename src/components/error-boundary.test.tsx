import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toastMock } from "@/test/mocks"

const clipboard = vi.hoisted(() => ({ writeText: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@tauri-apps/plugin-clipboard-manager", () => clipboard)
vi.mock("sonner", async () => (await import("@/test/mocks")).sonnerMock())

import { ErrorBoundary } from "./error-boundary"

const Boom = () => {
    throw new Error("kaboom")
}

describe("ErrorBoundary", () => {
    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => { })
        clipboard.writeText.mockClear()
        toastMock.error.mockClear()
        toastMock.success.mockClear()
    })
    afterEach(() => vi.restoreAllMocks())

    it("renders its children when nothing fails", () => {
        render(<ErrorBoundary><p>tutto ok</p></ErrorBoundary>)
        expect(screen.getByText("tutto ok")).toBeTruthy()
    })

    it("shows the error screen, logs the error and shows no toast", async () => {
        render(<ErrorBoundary><Boom /></ErrorBoundary>)
        expect(screen.getByRole("alert")).toBeTruthy()
        expect(screen.getByRole("button", { name: "Ricarica" })).toHaveFocus()
        await userEvent.click(screen.getByRole("button", { name: "Dettagli tecnici" }))
        expect(screen.getByText("kaboom").tagName).toBe("CODE")
        expect(screen.getByRole("heading", { level: 1 })).toBeTruthy()
        expect(screen.getByRole("button", { name: "Ricarica" })).toBeTruthy()
        expect(console.error).toHaveBeenCalled()
        expect(toastMock.error).not.toHaveBeenCalled()
    })

    it("shows a translated message and keeps the raw one in the technical details", async () => {
        const user = userEvent.setup()
        render(<ErrorBoundary><Boom /></ErrorBoundary>)
        expect(screen.getByText(/L'operazione non è riuscita/)).toBeInTheDocument()
        const trigger = screen.getByRole("button", { name: "Dettagli tecnici" })
        expect(trigger).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByText("kaboom")).not.toBeInTheDocument()
        await user.click(trigger)
        expect(screen.getByText("kaboom")).toBeVisible()
    })

    it("copies the error details to the clipboard", async () => {
        const user = userEvent.setup()
        render(<ErrorBoundary><Boom /></ErrorBoundary>)
        await user.click(screen.getByRole("button", { name: "Copia dettagli" }))
        expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Error: kaboom"))
        expect(toastMock.success).toHaveBeenCalled()
    })
})
