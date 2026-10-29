import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "./theme-provider"
import { useTheme } from "./use-theme"

type Listener = (event: { matches: boolean }) => void
let matches = false
let listeners = new Set<Listener>()

const Probe = () => {
    const { theme, resolvedTheme, setTheme } = useTheme()
    return (
        <div>
            <span data-testid="state">{theme}:{resolvedTheme}</span>
            <button onClick={() => setTheme("light")}>light</button>
        </div>
    )
}

const changeSystem = (dark: boolean) => act(() => {
    matches = dark
    listeners.forEach(l => l({ matches: dark }))
})

describe("ThemeProvider", () => {
    beforeEach(() => {
        matches = false
        listeners = new Set()
        localStorage.clear()
        vi.stubGlobal("matchMedia", vi.fn(() => ({
            get matches() { return matches },
            addEventListener: (_: string, l: Listener) => listeners.add(l),
            removeEventListener: (_: string, l: Listener) => listeners.delete(l),
        })))
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        document.documentElement.classList.remove("light", "dark")
    })

    it("follows the operating system live while the theme is system", () => {
        render(<ThemeProvider><Probe /></ThemeProvider>)
        expect(screen.getByTestId("state")).toHaveTextContent("system:light")
        expect(document.documentElement).toHaveClass("light")
        changeSystem(true)
        expect(screen.getByTestId("state")).toHaveTextContent("system:dark")
        expect(document.documentElement).toHaveClass("dark")
        expect(document.documentElement).not.toHaveClass("light")
    })

    it("stops listening when a fixed theme is chosen and on unmount", () => {
        const { unmount } = render(<ThemeProvider><Probe /></ThemeProvider>)
        expect(listeners.size).toBe(1)
        act(() => screen.getByText("light").click())
        expect(listeners.size).toBe(0)
        changeSystem(true)
        expect(screen.getByTestId("state")).toHaveTextContent("light:light")
        unmount()
        expect(listeners.size).toBe(0)
    })
})
