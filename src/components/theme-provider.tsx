import { applyAccentColor } from "@/lib/accent-color"
import { store } from "@/lib/store/initStore"
import { useEffect, useState } from "react"
import { ThemeProviderContext, type Theme } from "./theme-context"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type StoredColor = {
    hex: string;
    hsl: string;
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

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

    useEffect(() => {
        const applyInitialAccentColor = async () => {
            const primaryColor = await store.get<StoredColor>('primaryColor');
            const defaultColor = '#ffb375';

            const colorToApply = primaryColor?.hex || defaultColor;

            applyAccentColor(colorToApply);
        };

        applyInitialAccentColor();
    }, []);


    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}
