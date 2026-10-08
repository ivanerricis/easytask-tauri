import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { reportError } from "@/lib/report-error"
import { requestAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"

export const ButtonTrash = () => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { getTrashCount, trashVersion } = useWorkspaceData()
    const [count, setCount] = useState(0)
    const workspaceID = currentWorkspace?.id

    // Re-query the trash size when the trash content changes (every write that touches it bumps trashVersion)
    useEffect(() => {
        if (workspaceID === undefined) return
        let cancelled = false
        getTrashCount(workspaceID)
            .then(total => { if (!cancelled) setCount(total) })
            .catch(error => reportError(error))
        return () => { cancelled = true }
    }, [workspaceID, trashVersion, getTrashCount])

    return (
        <ItemFooter type="trash" text={t("trash.title")} badge={count} badgeLabel={t("sidebar.trashBadge", { count })} onClick={() => requestAppCommand("open-trash")} />
    )
}
