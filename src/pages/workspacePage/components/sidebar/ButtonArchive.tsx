import { useTranslation } from "react-i18next"
import { lazy, useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { LazyMount } from "@/components/lazy-mount"
import { useAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"

const DialogArchive = lazy(() => import("@/components/dialogs/dialog-archive").then(m => ({ default: m.DialogArchive })))

export const ButtonArchive = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getArchiveCount, archiveVersion } = useWorkspaceData()
    const [isOpen, setIsOpen] = useState(false)
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id
    useAppCommand("open-archive", () => setIsOpen(true))

    // Re-query the archive size when its content changes (every write that touches it bumps archiveVersion) or the dialog opens/closes
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        getArchiveCount(workspaceID)
            .then(total => { if (!cancelled) setCount(total) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, archiveVersion, isOpen, getArchiveCount])

    return (
        <>
            <ItemFooter type="archive" text={t("archive.title")} badge={count} badgeLabel={t("sidebar.archiveBadge", { count })} onClick={() => setIsOpen(true)} />
            <LazyMount active={isOpen}>
                <DialogArchive isOpen={isOpen} onOpenChange={setIsOpen} />
            </LazyMount>
        </>
    )
}
