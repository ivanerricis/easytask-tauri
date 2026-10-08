import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { requestAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"

export const ButtonArchive = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getArchiveCount, archiveVersion } = useWorkspaceData()
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    // Re-query the archive size when its content changes (every write that touches it bumps archiveVersion)
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        getArchiveCount(workspaceID)
            .then(total => { if (!cancelled) setCount(total) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, archiveVersion, getArchiveCount])

    return (
        <ItemFooter type="archive" text={t("archive.title")} badge={count} badgeLabel={t("sidebar.archiveBadge", { count })} onClick={() => requestAppCommand("open-archive")} />
    )
}
