import { useTranslation } from "react-i18next"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
                <Button variant="outline" size={"sm"} className="flex items-center justify-center gap-1 p-2">
                    <div className="relative w-[1.2rem] h-[1.2rem] flex items-center">
                        <Sun className="relative h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    </div>
                    <span className="sr-only">{t("settings.appearance.theme.toggle")}</span>
                    <span className="text-sm">{getThemeText()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    {t("settings.appearance.theme.light")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    {t("settings.appearance.theme.dark")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    {t("common.system")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}