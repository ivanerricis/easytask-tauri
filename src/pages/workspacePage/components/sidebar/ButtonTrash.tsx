import { useTranslation } from "react-i18next"
import { lazy, useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { LazyMount } from "@/components/lazy-mount"
import { useAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"

const DialogTrash = lazy(() => import("@/components/dialogs/dialog-trash").then(m => ({ default: m.DialogTrash })))

export const ButtonTrash = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getTrashCount, trashVersion } = useWorkspaceData()
    const [isOpen, setIsOpen] = useState(false)
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id
    useAppCommand("open-trash", () => setIsOpen(true))

    // Re-query the trash size when the trash content changes (every write that touches it bumps trashVersion) or the dialog opens/closes
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        getTrashCount(workspaceID)
            .then(total => { if (!cancelled) setCount(total) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, trashVersion, isOpen, getTrashCount])

    return (
        <>
            <ItemFooter type="trash" text={t("trash.title")} badge={count} badgeLabel={t("sidebar.trashBadge", { count })} onClick={() => setIsOpen(true)} />
            <LazyMount active={isOpen}>
                <DialogTrash isOpen={isOpen} onOpenChange={setIsOpen} />
            </LazyMount>
        </>
    )
}
