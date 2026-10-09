import { useTranslation } from "react-i18next"
import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/use-theme"

export function ModeToggle() {
    const { t } = useTranslation()
    const { theme, setTheme } = useTheme()

    const getThemeText = () => {
        switch (theme) {
            case 'light': return t("settings.appearance.theme.light")
            case 'dark': return t("settings.appearance.theme.dark")
            default: return t("common.system")
        }
    }

    return (
        <DropdownMenu >
            <DropdownMenuTrigger className="app-no-drag" asChild>
                <Button variant="outline" size={"sm"} aria-label={t("settings.appearance.theme.toggle")} className="flex items-center justify-center gap-1 p-2">
                    <div className="relative w-[1.2rem] h-[1.2rem] flex items-center">
                        <Sun className="relative h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    </div>
                    <span className="text-sm">{getThemeText()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={theme} onValueChange={value => setTheme(value as typeof theme)}>
                    <DropdownMenuRadioItem value="light"><Sun />{t("settings.appearance.theme.light")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark"><Moon />{t("settings.appearance.theme.dark")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system"><Monitor />{t("common.system")}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}