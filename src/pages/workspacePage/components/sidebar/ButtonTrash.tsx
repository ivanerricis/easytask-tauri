import { useTranslation } from "react-i18next"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { requestAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"
import { useVersionedCount } from "./use-versioned-count"

export const ButtonTrash = () => {
    const { t } = useTranslation()
    const { getTrashCount } = useWorkspaceActions()
    // Every write that touches the trash bumps its version, which queries the size again
    const count = useVersionedCount("trash", getTrashCount)

    return (
        <ItemFooter type="trash" text={t("trash.title")} badge={count} badgeLabel={t("sidebar.trashBadge", { count })} onClick={() => requestAppCommand("open-trash")} />
    )
}
