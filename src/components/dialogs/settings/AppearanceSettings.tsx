import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { usePreferences } from "@/contexts/use-preferences"
import { SettingsPanel, SettingsRow } from "./SettingsRow"
import { SidebarItemSizeSetting } from "./SidebarItemSizeSetting"

export const AppearanceSettings = () => {
    const { primaryColor, setPrimaryColor } = usePreferences()

    return (
        <SettingsPanel title="Aspetto">
            <SettingsRow label="Tema" description="Scegli tra tema chiaro, scuro o quello del sistema.">
                <ModeToggle />
            </SettingsRow>
            <SettingsRow label="Colore d'accento" description="Usato per pulsanti, selezioni ed evidenziazioni.">
                <div
                    className="flex items-center justify-center size-5 border rounded-xs"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Input
                        type="color"
                        aria-label="Colore d'accento"
                        className="opacity-0 cursor-pointer"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                </div>
            </SettingsRow>
            <SidebarItemSizeSetting />
        </SettingsPanel>
    )
}
