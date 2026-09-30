import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DialogSettings } from "./dialog-settings"

vi.mock("@tauri-apps/api/app", () => ({
    getName: vi.fn().mockResolvedValue("EasyTask"),
    getVersion: vi.fn().mockResolvedValue("9.8.7"),
    getTauriVersion: vi.fn().mockResolvedValue("2.1.0"),
}))
vi.mock("@/db/appPaths", () => ({
    ensureAppFolder: vi.fn().mockResolvedValue("C:\\Docs\\EasyTask"),
}))
vi.mock("@/components/mode-toggle", () => ({ ModeToggle: () => <div>mode-toggle</div> }))
vi.mock("@/contexts/preferences-context", () => ({
    usePreferences: () => ({
        primaryColor: "#000000", setPrimaryColor: vi.fn(),
        showProgressBar: true, setShowProgressBar: vi.fn(),
        showSectionCount: true, setShowSectionCount: vi.fn(),
        showTaskCount: true, setShowTaskCount: vi.fn(),
        resetPlayerPosition: vi.fn(),
    }),
}))

const open = async () => {
    const user = userEvent.setup()
    render(<DialogSettings />)
    await user.click(screen.getByRole("button"))
    return user
}

describe("DialogSettings", () => {
    it("shows Aspetto first and switches panels", async () => {
        const user = await open()
        expect(screen.getByRole("heading", { name: "Aspetto" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Aspetto" })).toHaveAttribute("aria-current", "page")

        await user.click(screen.getByRole("button", { name: "Note e sezioni" }))
        expect(screen.getByRole("heading", { name: "Note e sezioni" })).toBeInTheDocument()
        expect(screen.getByLabelText("Mostra numero di task")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Audio" }))
        expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument()
    })

    it("Informazioni is last and shows the app version", async () => {
        const user = await open()
        const items = screen.getByRole("navigation").querySelectorAll("button")
        expect(items[items.length - 1]).toHaveTextContent("Informazioni")

        await user.click(screen.getByRole("button", { name: "Informazioni" }))
        expect(await screen.findByText("9.8.7")).toBeInTheDocument()
        expect(screen.getByText("2.1.0")).toBeInTheDocument()
        expect(screen.getByText("Ivan Erricis")).toBeInTheDocument()
        expect(screen.getByText("C:\\Docs\\EasyTask\\easytask.db")).toBeInTheDocument()
    })
})
