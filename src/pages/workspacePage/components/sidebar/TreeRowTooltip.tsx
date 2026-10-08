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
    offset: number
    /** The row, whose focusable element is wrapped in a `TooltipTrigger asChild`. */
    children: ReactNode
}

/** Tooltip of a tree row: the full name, then the dates. The trigger is the (focusable) row itself, so it also shows on keyboard focus. */
export const TreeRowTooltip = ({ name, creationDate, creationTime, editDate, editTime, offset, children }: TreeRowTooltipProps) => {
    const { t } = useTranslation()
    return (
        <Tooltip delayDuration={500}>
            {children}
            <TooltipContent side="right" sideOffset={offset} className="border-background border-1">
                <div className="flex flex-col items-center justify-center w-full">
                    <p className="font-medium break-all">{name}</p>
                    <p>{t("common.creationDate", { date: formatDate(creationDate), time: creationTime })}</p>
                    <p>{t("common.editDate", { date: formatDate(editDate), time: editTime })}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    )
}
