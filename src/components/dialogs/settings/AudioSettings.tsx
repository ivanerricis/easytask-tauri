import { Button } from "@/components/ui/button"
import { usePreferences } from "@/contexts/preferences-context"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const AudioSettings = () => {
    const { resetPlayerPosition } = usePreferences()

    return (
        <SettingsPanel title="Audio">
            <SettingsRow label="Ripristina la posizione del player audio" description="Riporta il player alla posizione predefinita.">
                <Button variant="outline" size="sm" onClick={resetPlayerPosition}>
                    Reset
                </Button>
            </SettingsRow>
        </SettingsPanel>
    )
}
