import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { requestAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"

/**
 * Footer entry that opens the templates of the current workspace, with the number of templates as a badge.
 * @category Sidebar
 */
export const ButtonTemplates = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { countTemplates, templatesVersion } = useWorkspaceData()
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    // Re-query the number of templates when they change (templatesVersion)
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        countTemplates(workspaceID)
            .then(value => { if (!cancelled) setCount(value) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, templatesVersion, countTemplates])

    return (
        <ItemFooter type="template" text={t("dialogs.templates.title")} badge={count} badgeLabel={t("templates.badge", { count })} onClick={() => requestAppCommand("open-templates")} />
    )
}
