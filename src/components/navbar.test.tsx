import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Navbar } from "./navbar"

const appWindow = {
    isMaximized: vi.fn(),
    onResized: vi.fn(),
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
}
let resized: (() => void) | undefined
const stopListening = vi.fn()

vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => appWindow }))

beforeEach(() => {
    vi.clearAllMocks()
    resized = undefined
    appWindow.isMaximized.mockResolvedValue(false)
    appWindow.onResized.mockImplementation(async (handler: () => void) => {
        resized = handler
        return stopListening
    })
})

describe("window controls of the Navbar", () => {
    it("has minimize, maximize and close, in this order", () => {
        render(<Navbar />)
        const names = screen.getAllByRole("button").map(b => b.getAttribute("aria-label"))
        expect(names).toEqual(["Riduci a icona", "Ingrandisci", "Chiudi la finestra"])
    })

    it("calls the window for each button", async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        await user.click(screen.getByRole("button", { name: "Riduci a icona" }))
        await user.click(screen.getByRole("button", { name: "Ingrandisci" }))
        await user.click(screen.getByRole("button", { name: "Chiudi la finestra" }))
        expect(appWindow.minimize).toHaveBeenCalledTimes(1)
        expect(appWindow.toggleMaximize).toHaveBeenCalledTimes(1)
        expect(appWindow.close).toHaveBeenCalledTimes(1)
    })

    it("shows a square to maximize, and the restore icon while the window is maximized", async () => {
        appWindow.isMaximized.mockResolvedValue(true)
        render(<Navbar />)
        const restore = await screen.findByRole("button", { name: "Ripristina" })
        expect(restore.querySelector("svg.lucide-copy")).not.toBeNull()
        expect(screen.queryByRole("button", { name: "Ingrandisci" })).not.toBeInTheDocument()
    })

    it("starts with the square when the window is not maximized", async () => {
        render(<Navbar />)
        const maximize = await screen.findByRole("button", { name: "Ingrandisci" })
        expect(maximize.querySelector("svg.lucide-square")).not.toBeNull()
    })

    it("follows the window when it is maximized or restored from outside (double click on the title bar, snap)", async () => {
        render(<Navbar />)
        await screen.findByRole("button", { name: "Ingrandisci" })
        await waitFor(() => expect(resized).toBeTypeOf("function"))

        appWindow.isMaximized.mockResolvedValue(true)
        act(() => resized?.())
        expect(await screen.findByRole("button", { name: "Ripristina" })).toBeInTheDocument()

        appWindow.isMaximized.mockResolvedValue(false)
        act(() => resized?.())
        expect(await screen.findByRole("button", { name: "Ingrandisci" })).toBeInTheDocument()
    })

    it("stops listening when it unmounts, also when the subscription arrives later", async () => {
        const { unmount } = render(<Navbar />)
        await waitFor(() => expect(appWindow.onResized).toHaveBeenCalled())
        unmount()
        await waitFor(() => expect(stopListening).toHaveBeenCalledTimes(1))

        let late: ((stop: () => void) => void) | undefined
        appWindow.onResized.mockImplementation(() => new Promise<() => void>(resolve => { late = resolve }))
        stopListening.mockClear()
        const second = render(<Navbar />)
        second.unmount()
        late?.(stopListening)
        await waitFor(() => expect(stopListening).toHaveBeenCalledTimes(1))
    })

    it("does not break when the window cannot be queried", async () => {
        appWindow.isMaximized.mockRejectedValue(new Error("no permission"))
        appWindow.onResized.mockRejectedValue(new Error("no permission"))
        render(<Navbar />)
        expect(await screen.findByRole("button", { name: "Ingrandisci" })).toBeInTheDocument()
    })

    it("uses the text color for the icons (the accent can be unreadable) and a red hover for close", () => {
        render(<Navbar />)
        for (const name of ["Riduci a icona", "Ingrandisci", "Chiudi la finestra"]) {
            const button = screen.getByRole("button", { name })
            expect(button).toHaveClass("text-foreground")
            expect(button).not.toHaveClass("text-primary")
        }
        expect(screen.getByRole("button", { name: "Chiudi la finestra" }).className).toContain("hover:!bg-window-close")
        expect(screen.getByRole("button", { name: "Riduci a icona" }).className).not.toContain("window-close")
    })

    it("shows the other containers around the controls", () => {
        render(<Navbar leftContainer={<span>left</span>} centerContainer={<span>center</span>} rightContainer={<span>right</span>} />)
        expect(screen.getByText("left")).toBeInTheDocument()
        expect(screen.getByText("center")).toBeInTheDocument()
        expect(screen.getByText("right")).toBeInTheDocument()
    })
})
