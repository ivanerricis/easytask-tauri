import { useTranslation } from "react-i18next"
import { LayoutTemplate } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TemplateTabLabelProps = {
    /** The name of the template. */
    name: string
    className?: string
}

/**
 * The label of the tab of a template editor: the template icon, the "Template" badge and the name, so it is never
 * mistaken for a note.
 */
export const TemplateTabLabel = ({ name, className }: TemplateTabLabelProps) => {
    const { t } = useTranslation()

    return (
        <span className={cn("flex min-w-0 items-center gap-1.5", className)} title={t("templateEditor.tab", { name })}>
            <Badge variant="outline" className="shrink-0"><LayoutTemplate aria-hidden />{t("templateEditor.badge")}</Badge>
            <span className="min-w-0 truncate">{name}</span>
        </span>
    )
}
