import { Checkbox } from "@/components/ui/checkbox"
import { usePreferences } from "@/contexts/preferences-context"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const NotesSettings = () => {
    const {
        showProgressBar, setShowProgressBar,
        showSectionCount, setShowSectionCount,
        showTaskCount, setShowTaskCount,
        reopenNotes, setReopenNotes,
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
            <SettingsRow label="Riapri le note all'avvio" description="Ripristina le note aperte e quella attiva quando riapri un workspace.">
                <Checkbox
                    aria-label="Riapri le note all'avvio"
                    checked={reopenNotes}
                    onCheckedChange={() => setReopenNotes(!reopenNotes)}
                    className="size-5"
                />
            </SettingsRow>
        </SettingsPanel>
    )
}
