import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()

    const getThemeText = () => {
        switch (theme) {
            case 'light': return 'Chiaro'
            case 'dark': return 'Scuro'
            default: return 'Sistema'
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
                    <span className="sr-only">Toggle theme</span>
                    <span className="text-sm">{getThemeText()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    Chiaro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Scuro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    Sistema
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}