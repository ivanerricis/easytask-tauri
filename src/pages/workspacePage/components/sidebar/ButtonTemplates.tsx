import { useTranslation } from "react-i18next"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { requestAppCommand } from "@/lib/app-commands"
import { ItemFooter } from "../items/ItemFooter"
import { useVersionedCount } from "./use-versioned-count"

/**
 * Footer entry that opens the templates of the current workspace, with the number of templates as a badge.
 * @category Sidebar
 */
export const ButtonTemplates = () => {
    const { t } = useTranslation()
    const { countTemplates } = useWorkspaceActions()
    const count = useVersionedCount("templates", countTemplates)

    return (
        <ItemFooter type="template" text={t("dialogs.templates.title")} badge={count} badgeVariant="outline" badgeLabel={t("templates.badge", { count })} onClick={() => requestAppCommand("open-templates")} />
    )
}
