import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AccentContrastHint } from "./AccentContrastHint"
import { DEFAULT_PRIMARY_COLOR, accentContrast } from "@/lib/accent-color"

const setPrimaryColor = vi.fn()
const state = { theme: "light" as "light" | "dark" | "system", primaryColor: DEFAULT_PRIMARY_COLOR }
vi.mock("@/components/use-theme", () => ({ useTheme: () => ({ theme: state.theme, setTheme: vi.fn() }) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ primaryColor: state.primaryColor, setPrimaryColor }) }))

beforeEach(() => {
    vi.clearAllMocks()
    state.theme = "light"
    state.primaryColor = DEFAULT_PRIMARY_COLOR
    document.documentElement.style.removeProperty("--primary")
})

describe("AccentContrastHint", () => {
    it("shows nothing for a color with enough contrast", () => {
        const { container } = render(<AccentContrastHint />)
        expect(container).toBeEmptyDOMElement()
    })

    it("warns about the light theme and offers a darker color of the same hue", async () => {
        const user = userEvent.setup()
        state.primaryColor = "#ffe119"
        render(<AccentContrastHint />)
        expect(screen.getByRole("status")).toHaveTextContent(/tema chiaro/)
        const button = screen.getByRole("button", { name: /^Usa #/ })
        const suggestion = /#[0-9A-F]{6}/.exec(button.textContent ?? "")![0].toLowerCase()
        expect(accentContrast(suggestion, "light")!).toBeGreaterThanOrEqual(3)

        await user.click(button)
        expect(setPrimaryColor).toHaveBeenCalledWith(suggestion)
        expect(document.documentElement.style.getPropertyValue("--primary")).toBe(suggestion)
    })

    it("checks the background of the dark theme when it is the one in use", () => {
        state.theme = "dark"
        state.primaryColor = "#1e3a8a"
        render(<AccentContrastHint />)
        expect(screen.getByRole("status")).toHaveTextContent(/tema scuro/)
    })

    it("a color that is fine on the dark theme is not reported there, only on the light one", () => {
        state.primaryColor = "#ffe119"
        state.theme = "dark"
        const { container } = render(<AccentContrastHint />)
        expect(container).toBeEmptyDOMElement()
    })
})
