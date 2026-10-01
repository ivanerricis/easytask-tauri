import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const clipboard = vi.hoisted(() => ({ writeText: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@tauri-apps/plugin-clipboard-manager", () => clipboard)
const sonner = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("sonner", () => sonner)

import { ErrorBoundary } from "./error-boundary"

const Boom = () => {
    throw new Error("kaboom")
}

describe("ErrorBoundary", () => {
    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => { })
        clipboard.writeText.mockClear()
        sonner.toast.error.mockClear()
        sonner.toast.success.mockClear()
    })
    afterEach(() => vi.restoreAllMocks())

    it("renders its children when nothing fails", () => {
        render(<ErrorBoundary><p>tutto ok</p></ErrorBoundary>)
        expect(screen.getByText("tutto ok")).toBeTruthy()
    })

    it("shows the error screen, logs the error and shows no toast", () => {
        render(<ErrorBoundary><Boom /></ErrorBoundary>)
        expect(screen.getByRole("alert")).toBeTruthy()
        expect(screen.getByText("kaboom")).toBeTruthy()
        expect(screen.getByRole("button", { name: "Ricarica" })).toBeTruthy()
        expect(console.error).toHaveBeenCalled()
        expect(sonner.toast.error).not.toHaveBeenCalled()
    })

    it("copies the error details to the clipboard", async () => {
        const user = userEvent.setup()
        render(<ErrorBoundary><Boom /></ErrorBoundary>)
        await user.click(screen.getByRole("button", { name: "Copia dettagli" }))
        expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Error: kaboom"))
        expect(sonner.toast.success).toHaveBeenCalled()
    })
})
