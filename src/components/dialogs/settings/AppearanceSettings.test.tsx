import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppearanceSettings } from "./AppearanceSettings"

const prefs = { primaryColor: "#336699", setPrimaryColor: vi.fn() }
vi.mock("@/components/tooltip-custom", () => ({ TooltipCustom: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs }))
vi.mock("@/components/mode-toggle", () => ({ ModeToggle: () => null }))
vi.mock("./LanguageSetting", () => ({ LanguageSetting: () => null }))
vi.mock("./SidebarItemSizeSetting", () => ({ SidebarItemSizeSetting: () => null }))
vi.mock("./ColorIntensitySetting", () => ({ ColorIntensitySetting: () => null }))
vi.mock("./ResetAppearanceSetting", () => ({ ResetAppearanceSetting: () => null }))

const picker = () => screen.getByLabelText("Colore d'accento") as HTMLInputElement

beforeEach(() => {
    vi.useFakeTimers()
    prefs.primaryColor = "#336699"
    prefs.setPrimaryColor.mockReset()
    document.documentElement.style.removeProperty("--primary")
})
afterEach(() => { vi.useRealTimers() })

describe("accent color picker", () => {
    it("previews every change on the page at once, but stores the color only once the picker rests", () => {
        render(<AppearanceSettings />)
        for (const hex of ["#101010", "#202020", "#303030", "#336699"]) fireEvent.change(picker(), { target: { value: hex } })

        // Live preview: the page already has the last color, and so has the picker
        expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#336699")
        expect(picker().value).toBe("#336699")
        // Nothing stored (no re-render of the app, no save) while the color is being dragged
        expect(prefs.setPrimaryColor).not.toHaveBeenCalled()

        act(() => { vi.advanceTimersByTime(300) })
        expect(prefs.setPrimaryColor).toHaveBeenCalledTimes(1)
        expect(prefs.setPrimaryColor).toHaveBeenCalledWith("#336699")
    })

    it("restarts the wait at every change", () => {
        render(<AppearanceSettings />)
        fireEvent.change(picker(), { target: { value: "#111111" } })
        act(() => { vi.advanceTimersByTime(200) })
        fireEvent.change(picker(), { target: { value: "#222222" } })
        act(() => { vi.advanceTimersByTime(200) })
        expect(prefs.setPrimaryColor).not.toHaveBeenCalled()
        act(() => { vi.advanceTimersByTime(100) })
        expect(prefs.setPrimaryColor).toHaveBeenCalledOnce()
        expect(prefs.setPrimaryColor).toHaveBeenCalledWith("#222222")
    })

    it("stores a pending color when the settings are closed", () => {
        const { unmount } = render(<AppearanceSettings />)
        fireEvent.change(picker(), { target: { value: "#abcdef" } })
        unmount()
        expect(prefs.setPrimaryColor).toHaveBeenCalledOnce()
        expect(prefs.setPrimaryColor).toHaveBeenCalledWith("#abcdef")
    })

    it("stores nothing when nothing was changed", () => {
        const { unmount } = render(<AppearanceSettings />)
        act(() => { vi.advanceTimersByTime(1000) })
        unmount()
        expect(prefs.setPrimaryColor).not.toHaveBeenCalled()
    })

    it("resets to the default orange at once, dropping a pending change", () => {
        render(<AppearanceSettings />)
        fireEvent.change(picker(), { target: { value: "#123456" } })
        fireEvent.click(screen.getByRole("button", { name: "Ripristina il colore d'accento" }))

        expect(prefs.setPrimaryColor).toHaveBeenCalledOnce()
        expect(prefs.setPrimaryColor).toHaveBeenCalledWith("#c2410c")
        expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#c2410c")
        act(() => { vi.advanceTimersByTime(1000) })
        // the dropped change is not stored afterwards
        expect(prefs.setPrimaryColor).toHaveBeenCalledOnce()
    })

    it("disables the reset button while the color is the default", () => {
        prefs.primaryColor = "#C2410C"
        render(<AppearanceSettings />)
        expect(screen.getByRole("button", { name: "Ripristina il colore d'accento" })).toBeDisabled()
    })

    it("follows the stored color when it changes elsewhere (reset)", () => {
        const { rerender } = render(<AppearanceSettings />)
        expect(picker().value).toBe("#336699")
        prefs.primaryColor = "#00ff00"
        rerender(<AppearanceSettings />)
        expect(picker().value).toBe("#00ff00")
    })
})
