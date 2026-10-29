import { useTranslation } from "react-i18next"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { requestAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"
import { useVersionedCount } from "./use-versioned-count"

export const ButtonArchive = () => {
    const { t } = useTranslation()
    const { getArchiveCount } = useWorkspaceActions()
    // Every write that touches the archive bumps its version, which queries the size again
    const count = useVersionedCount("archive", getArchiveCount)

    return (
        <ItemFooter type="archive" text={t("archive.title")} badge={count} badgeLabel={t("sidebar.archiveBadge", { count })} onClick={() => requestAppCommand("open-archive")} />
    )
}
