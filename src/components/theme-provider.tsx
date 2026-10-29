import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { ThemeProviderContext, type Theme } from "./theme-context"

const DARK_QUERY = "(prefers-color-scheme: dark)"
const prefersDark = (): boolean => typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    // While following the system, a change of the operating system theme is applied live (the subscription lives only then)
    const subscribe = useCallback((onChange: () => void) => {
        if (theme !== "system" || typeof window.matchMedia !== "function") return () => {}
        const query = window.matchMedia(DARK_QUERY)
        query.addEventListener("change", onChange)
        return () => query.removeEventListener("change", onChange)
    }, [theme])
    const systemDark = useSyncExternalStore(subscribe, prefersDark)

    const resolvedTheme: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        root.classList.add(resolvedTheme)
    }, [resolvedTheme])

    // The accent color is applied by the PreferencesProvider (it reads and validates the stored one)
    const value = useMemo(() => ({
        theme,
        resolvedTheme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }), [theme, resolvedTheme, storageKey])

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}
