import { useTranslation } from "react-i18next"
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select"
import { usePreferences } from "@/contexts/use-preferences"
import { useWorkspace } from "@/contexts/use-workspace"
import { SettingsSelectRow } from "./SettingsRow"

const HOME = "home"
const LAST = "last"
const FIXED_PREFIX = "ws:"

/**
 * What the app opens at startup: the home page, the last workspace used, or always one workspace chosen here. It keeps the
 * stored "reopen the last workspace" switch (off = home) and adds the optional fixed workspace.
 */
export const StartupWorkspaceSetting = () => {
    const { t } = useTranslation()
    const { reopenLastWorkspace, setReopenLastWorkspace, startupWorkspaceId, setStartupWorkspaceId } = usePreferences()
    const { workspaces } = useWorkspace()

    const fixed = reopenLastWorkspace ? workspaces.find(workspace => workspace.id === startupWorkspaceId) : undefined
    const value = !reopenLastWorkspace ? HOME : fixed ? `${FIXED_PREFIX}${fixed.id}` : LAST

    const change = (next: string) => {
        if (next === HOME) {
            setReopenLastWorkspace(false)
            return
        }
        setReopenLastWorkspace(true)
        setStartupWorkspaceId(next.startsWith(FIXED_PREFIX) ? Number(next.slice(FIXED_PREFIX.length)) : null)
    }

    return (
        <SettingsSelectRow
            label={t("settings.notes.startupWorkspace.label")}
            description={t("settings.notes.startupWorkspace.description")}
            value={value}
            onValueChange={change}
            width="w-56"
        >
            <SelectItem value={HOME}>{t("settings.notes.startupWorkspace.home")}</SelectItem>
            <SelectItem value={LAST}>{t("settings.notes.startupWorkspace.last")}</SelectItem>
            {workspaces.length > 0 && (
                <>
                    <SelectSeparator />
                    <SelectGroup>
                        <SelectLabel>{t("settings.notes.startupWorkspace.always")}</SelectLabel>
                        {workspaces.map(workspace => (
                            <SelectItem key={workspace.id} value={`${FIXED_PREFIX}${workspace.id}`}>{workspace.name}</SelectItem>
                        ))}
                    </SelectGroup>
                </>
            )}
        </SettingsSelectRow>
    )
}
