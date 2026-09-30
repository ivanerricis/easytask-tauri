import { Checkbox } from "@/components/ui/checkbox"
import { usePreferences } from "@/contexts/preferences-context"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const NotesSettings = () => {
    const {
        showProgressBar, setShowProgressBar,
        showSectionCount, setShowSectionCount,
        showTaskCount, setShowTaskCount,
    } = usePreferences()

    return (
        <SettingsPanel title="Note e sezioni">
            <SettingsRow label="Mostra barra d'avanzamento nelle sezioni" description="Indica la percentuale di task completati.">
                <Checkbox
                    aria-label="Mostra barra d'avanzamento nelle sezioni"
                    checked={showProgressBar}
                    onCheckedChange={() => setShowProgressBar(!showProgressBar)}
                    className="size-5"
                />
            </SettingsRow>
            <SettingsRow label="Mostra numero di sezioni">
                <Checkbox
                    aria-label="Mostra numero di sezioni"
                    checked={showSectionCount}
                    onCheckedChange={() => setShowSectionCount(!showSectionCount)}
                    className="size-5"
                />
            </SettingsRow>
            <SettingsRow label="Mostra numero di task">
                <Checkbox
                    aria-label="Mostra numero di task"
                    checked={showTaskCount}
                    onCheckedChange={() => setShowTaskCount(!showTaskCount)}
                    className="size-5"
                />
            </SettingsRow>
        </SettingsPanel>
    )
}
