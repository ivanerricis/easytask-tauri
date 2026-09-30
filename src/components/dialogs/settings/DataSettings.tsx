import { useLocation } from "react-router-dom"
import { openPath } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ensureAppFolder } from "@/db/appPaths"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceTransfer } from "@/hooks/use-workspace-transfer"
import { getErrorMessage } from "@/lib/utils"
import { SettingsPanel, SettingsRow } from "./SettingsRow"

export const DataSettings = () => {
    const { exportWorkspace, importWorkspace, isBusy } = useWorkspaceTransfer()
    const { currentWorkspace } = useWorkspace()
    const { pathname } = useLocation()
    // currentWorkspace is not cleared on the start page: offer the export only inside a workspace
    const current = pathname.startsWith("/workspace/") ? currentWorkspace : null

    const openDataFolder = async () => {
        try {
            await openPath(await ensureAppFolder())
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <SettingsPanel title="Dati">
            <SettingsRow label="Importa workspace" description="Crea un nuovo workspace da un file di esportazione EasyTask.">
                <Button variant="outline" size="sm" disabled={isBusy} onClick={() => void importWorkspace()}>
                    Importa
                </Button>
            </SettingsRow>
            {current && (
                <SettingsRow label="Esporta workspace corrente" description={`Salva "${current.name}" in un file .easytask.json.`}>
                    <Button variant="outline" size="sm" disabled={isBusy} onClick={() => void exportWorkspace(current)}>
                        Esporta
                    </Button>
                </SettingsRow>
            )}
            <SettingsRow label="Apri cartella dati" description="Apre la cartella EasyTask nei Documenti.">
                <Button variant="outline" size="sm" onClick={() => void openDataFolder()}>
                    Apri
                </Button>
            </SettingsRow>
        </SettingsPanel>
    )
}
