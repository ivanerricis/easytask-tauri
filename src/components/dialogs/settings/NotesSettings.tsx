import { Switch } from "@/components/ui/switch"
import { usePreferences } from "@/contexts/use-preferences"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const NotesSettings = () => {
    const {
        showProgressBar, setShowProgressBar,
        showGroupProgressBar, setShowGroupProgressBar,
        showSectionCount, setShowSectionCount,
        showTaskCount, setShowTaskCount,
        reopenNotes, setReopenNotes,
        reopenLastWorkspace, setReopenLastWorkspace,
    } = usePreferences()

    return (
        <SettingsPanel title="Note e sezioni">
            <SettingsRow label="Mostra barra d'avanzamento nelle sezioni" description="Indica la percentuale di task completati.">
                <Switch
                    aria-label="Mostra barra d'avanzamento nelle sezioni"
                    checked={showProgressBar}
                    onCheckedChange={() => setShowProgressBar(!showProgressBar)}
                />
            </SettingsRow>
            <SettingsRow label="Mostra barra d'avanzamento nei gruppi" description="Conta tutti i task e i sottotask del gruppo.">
                <Switch
                    aria-label="Mostra barra d'avanzamento nei gruppi"
                    checked={showGroupProgressBar}
                    onCheckedChange={() => setShowGroupProgressBar(!showGroupProgressBar)}
                />
            </SettingsRow>
            <SettingsRow label="Mostra numero di sezioni">
                <Switch
                    aria-label="Mostra numero di sezioni"
                    checked={showSectionCount}
                    onCheckedChange={() => setShowSectionCount(!showSectionCount)}
                />
            </SettingsRow>
            <SettingsRow label="Mostra numero di task">
                <Switch
                    aria-label="Mostra numero di task"
                    checked={showTaskCount}
                    onCheckedChange={() => setShowTaskCount(!showTaskCount)}
                />
            </SettingsRow>
            <SettingsRow label="Riapri l'ultimo workspace all'avvio" description="Se chiudi l'app dentro un workspace, lo riapre al prossimo avvio.">
                <Switch
                    aria-label="Riapri l'ultimo workspace all'avvio"
                    checked={reopenLastWorkspace}
                    onCheckedChange={() => setReopenLastWorkspace(!reopenLastWorkspace)}
                />
            </SettingsRow>
            <SettingsRow label="Riapri le note all'avvio" description="Ripristina le note aperte e quella attiva quando riapri un workspace.">
                <Switch
                    aria-label="Riapri le note all'avvio"
                    checked={reopenNotes}
                    onCheckedChange={() => setReopenNotes(!reopenNotes)}
                />
            </SettingsRow>
        </SettingsPanel>
    )
}
