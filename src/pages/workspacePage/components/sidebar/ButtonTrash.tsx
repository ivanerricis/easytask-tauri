import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { DialogTrash } from "@/components/dialogs/dialog-trash"
import { ItemFooter } from "../items/ItemFooter"

export const ButtonTrash = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { workspaceDataTree, getTrash, trashVersion } = useWorkspaceData()
    const [isOpen, setIsOpen] = useState(false)
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    // Re-query the trash size when the tree changes, the trash content changes (trashVersion) or the dialog opens/closes
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        getTrash(workspaceID)
            .then(items => { if (!cancelled) setCount(items.length) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, workspaceDataTree, trashVersion, isOpen, getTrash])

    return (
        <>
            <ItemFooter type="trash" text={t("trash.title")} badge={count} badgeLabel={t("sidebar.trashBadge", { count })} onClick={() => setIsOpen(true)} />
            <DialogTrash isOpen={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}
