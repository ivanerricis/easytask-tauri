import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { DialogTemplates } from "@/components/dialogs/dialog-templates"
import { ItemFooter } from "../items/ItemFooter"

/**
 * Footer entry that opens the templates of the current workspace, with the number of templates as a badge.
 * @category Sidebar
 */
export const ButtonTemplates = () => {
    const { currentWorkspace } = useWorkspace()
    const { countTemplates, templatesVersion } = useWorkspaceData()
    const [isOpen, setIsOpen] = useState(false)
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    // Re-query the number of templates when they change (templatesVersion) or the dialog opens/closes
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        countTemplates(workspaceID)
            .then(value => { if (!cancelled) setCount(value) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, templatesVersion, isOpen, countTemplates])

    return (
        <>
            <ItemFooter type="template" text="Template" badge={count} badgeLabel={`${count} template`} onClick={() => setIsOpen(true)} />
            <DialogTemplates isOpen={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}
