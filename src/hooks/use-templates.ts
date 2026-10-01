import i18n from "@/i18n"
import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import type { NoteTemplate } from "@/types/template"

/**
 * Loads the templates of the current workspace while `enabled` is true (e.g. while a dialog is open).
 * Loading errors are reported to the user; the list stays empty.
 * @param enabled Whether to load the templates.
 * @returns The templates, ordered by name.
 * @category Hooks
 */
export function useTemplates(enabled: boolean): NoteTemplate[] {
    const { currentWorkspace } = useWorkspace()
    const { getTemplates } = useWorkspaceActions()
    const [templates, setTemplates] = useState<NoteTemplate[]>([])
    const workspaceID = currentWorkspace?.id

    useEffect(() => {
        if (!enabled || workspaceID === undefined) return
        let cancelled = false
        getTemplates(workspaceID)
            .then(list => { if (!cancelled) setTemplates(list) })
            .catch(error => reportError(error, i18n.t("errors.loadTemplates")))
        return () => { cancelled = true }
    }, [enabled, workspaceID, getTemplates])

    return templates
}
