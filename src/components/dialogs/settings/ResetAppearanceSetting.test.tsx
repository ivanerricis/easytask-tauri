import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_COLOR_INTENSITY } from "@/lib/color-intensity"
import { DEFAULT_PRIMARY_COLOR } from "@/lib/store/preferences"
import { ResetAppearanceSetting } from "./ResetAppearanceSetting"

const setTheme = vi.fn()
const setPrimaryColor = vi.fn()
const setLanguage = vi.fn()
const setSidebarItemSize = vi.fn()
const setColorIntensity = vi.fn()
const setAnimationSpeed = vi.fn()

const state = {
    theme: "system",
    primaryColor: DEFAULT_PRIMARY_COLOR,
    language: "system",
    sidebarItemSize: "normal",
    colorIntensity: DEFAULT_COLOR_INTENSITY,
    animationSpeed: "normal",
}

vi.mock("@/components/use-theme", () => ({ useTheme: () => ({ theme: state.theme, setTheme }) }))
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({ ...state, setPrimaryColor, setLanguage, setSidebarItemSize, setColorIntensity, setAnimationSpeed }),
}))

beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(state, {
        theme: "system", primaryColor: DEFAULT_PRIMARY_COLOR, language: "system", sidebarItemSize: "normal", colorIntensity: DEFAULT_COLOR_INTENSITY, animationSpeed: "normal",
    })
})

describe("ResetAppearanceSetting", () => {
    it("is disabled while everything is already at its default", () => {
        render(<ResetAppearanceSetting />)
        expect(screen.getByRole("button", { name: "Ripristina tutto" })).toBeDisabled()
    })

    it.each([
        ["theme", { theme: "dark" }],
        ["accent color", { primaryColor: "#3366ff" }],
        ["language", { language: "en" }],
        ["size of folders and notes", { sidebarItemSize: "large" }],
        ["color intensity", { colorIntensity: 1.5 }],
        ["speed of the animations", { animationSpeed: "none" }],
    ])("is enabled when the %s was changed", (_name, change) => {
        Object.assign(state, change)
        render(<ResetAppearanceSetting />)
        expect(screen.getByRole("button", { name: "Ripristina tutto" })).toBeEnabled()
    })

    it("treats the accent color case-insensitively", () => {
        state.primaryColor = DEFAULT_PRIMARY_COLOR.toUpperCase()
        render(<ResetAppearanceSetting />)
        expect(screen.getByRole("button", { name: "Ripristina tutto" })).toBeDisabled()
    })

    it("asks for confirmation and resets every control to its default", async () => {
        Object.assign(state, { theme: "dark", primaryColor: "#3366ff", language: "en", sidebarItemSize: "large", colorIntensity: 1.5, animationSpeed: "slow" })
        const user = userEvent.setup()
        render(<ResetAppearanceSetting />)

        await user.click(screen.getByRole("button", { name: "Ripristina tutto" }))
        const dialog = await screen.findByRole("dialog")
        expect(dialog).toHaveTextContent("Ripristinare l'aspetto?")
        expect(setTheme).not.toHaveBeenCalled()

        await user.click(screen.getByRole("button", { name: "Ripristina" }))

        expect(setTheme).toHaveBeenCalledWith("system")
        expect(setPrimaryColor).toHaveBeenCalledWith(DEFAULT_PRIMARY_COLOR)
        expect(setLanguage).toHaveBeenCalledWith("system")
        expect(setSidebarItemSize).toHaveBeenCalledWith("normal")
        expect(setColorIntensity).toHaveBeenCalledWith(DEFAULT_COLOR_INTENSITY)
        expect(setAnimationSpeed).toHaveBeenCalledWith("normal")
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    })

    it("changes nothing when the confirmation is cancelled", async () => {
        state.theme = "dark"
        const user = userEvent.setup()
        render(<ResetAppearanceSetting />)
        await user.click(screen.getByRole("button", { name: "Ripristina tutto" }))
        await user.click(await screen.findByRole("button", { name: "Annulla" }))
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        expect(setTheme).not.toHaveBeenCalled()
        expect(setPrimaryColor).not.toHaveBeenCalled()
    })
})
