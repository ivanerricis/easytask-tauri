import { createContext } from "react"

export type Theme = "dark" | "light" | "system"

type ThemeProviderState = {
    theme: Theme
    /** The theme actually shown: "system" resolved to the current preference of the operating system (kept up to date). */
    resolvedTheme: "light" | "dark"
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    resolvedTheme: "light",
    setTheme: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)
