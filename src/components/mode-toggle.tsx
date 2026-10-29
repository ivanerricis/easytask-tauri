import { useTranslation } from "react-i18next"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isTheme, THEME_OPTIONS } from "@/components/theme-options"
import { useTheme } from "@/components/use-theme"

export function ModeToggle() {
    const { t } = useTranslation()
    const { theme, setTheme } = useTheme()

    // "system" is also the label of any value that is not a known theme
    const getThemeText = () => t((THEME_OPTIONS.find(option => option.value === theme) ?? THEME_OPTIONS[2]).labelKey)

    return (
        <DropdownMenu >
            <DropdownMenuTrigger className="app-no-drag" asChild>
                <Button variant="outline" size={"sm"} aria-label={`${t("settings.appearance.theme.toggle")}: ${getThemeText()}`} className="flex items-center justify-center gap-1 p-2">
                    <div className="relative w-[1.2rem] h-[1.2rem] flex items-center">
                        <Sun className="relative h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    </div>
                    <span className="text-sm">{getThemeText()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={theme} onValueChange={value => { if (isTheme(value)) setTheme(value) }}>
                    {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                        <DropdownMenuRadioItem key={value} value={value}><Icon />{t(labelKey)}</DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}