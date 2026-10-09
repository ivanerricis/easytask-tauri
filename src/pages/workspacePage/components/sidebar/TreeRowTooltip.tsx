import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/utils"

type TreeRowTooltipProps = {
    /** Full name of the item (the row truncates it). */
    name: string
    creationDate: string
    creationTime: string
    editDate: string
    editTime: string
    /** The row, whose focusable element is wrapped in a `TooltipTrigger asChild`. */
    children: ReactNode
}

/** Offset of the tooltip from the right edge of the row: like every tooltip, the tip of the arrow (about 5px) ends about 3px from the row. */
const TOOLTIP_OFFSET = -2

/** Tooltip of a tree row: the full name, then the dates. The trigger is the (focusable) row itself, so it also shows on keyboard focus. */
export const TreeRowTooltip = ({ name, creationDate, creationTime, editDate, editTime, children }: TreeRowTooltipProps) => {
    const { t } = useTranslation()
    return (
        <Tooltip>
            {children}
            <TooltipContent side="right" sideOffset={TOOLTIP_OFFSET}>
                <div className="flex flex-col items-center justify-center w-full">
                    <p className="font-medium break-all">{name}</p>
                    <p>{t("common.creationDate", { date: formatDate(creationDate), time: creationTime })}</p>
                    <p>{t("common.editDate", { date: formatDate(editDate), time: editTime })}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    )
}
