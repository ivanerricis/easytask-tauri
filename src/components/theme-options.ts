import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import type { Theme } from "./theme-context"

/** The themes the user can choose, in the order of the menus, with their icon and translation key. */
export const THEME_OPTIONS = [
    { value: "light", icon: Sun, labelKey: "settings.appearance.theme.light" },
    { value: "dark", icon: Moon, labelKey: "settings.appearance.theme.dark" },
    { value: "system", icon: Monitor, labelKey: "common.system" },
] as const satisfies readonly { value: Theme, icon: LucideIcon, labelKey: string }[]

/** Type guard for the value of a theme menu (the radio groups hand over a plain string). */
export const isTheme = (value: string): value is Theme => THEME_OPTIONS.some(option => option.value === value)
