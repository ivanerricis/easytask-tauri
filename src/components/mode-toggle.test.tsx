import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ThemeProviderContext } from "./theme-context"
import { ModeToggle } from "./mode-toggle"

describe("ModeToggle", () => {
    it("has an accessible name that contains the visible theme and announces it", () => {
        render(
            <ThemeProviderContext.Provider value={{ theme: "dark", resolvedTheme: "dark", setTheme: () => { } }}>
                <ModeToggle />
            </ThemeProviderContext.Provider>
        )
        const button = screen.getByRole("button", { name: "Cambia tema: Scuro" })
        expect(button).toHaveTextContent("Scuro")
    })
})
