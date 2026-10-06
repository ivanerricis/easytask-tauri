import type { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type InlineErrorTooltipProps = {
    /** The error to show; the tooltip is open while it is set. */
    message: string | null
    /** The field the error refers to (a single element that takes a ref). */
    children: ReactNode
}

/**
 * Shows the error of an inline edit (rename of a task, section or group) next to the field, without moving the layout
 * and without taking the focus: the user keeps typing and the message goes away with the next change.
 * Pair it with `aria-invalid` and a red border on the field.
 * @category Components
 */
export const InlineErrorTooltip = ({ message, children }: InlineErrorTooltipProps) => (
    <Tooltip open={message !== null}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent role="alert" side="bottom" align="start" sideOffset={4} className="bg-destructive text-white dark:text-black max-w-xs break-words [&>span]:hidden">
            {message}
        </TooltipContent>
    </Tooltip>
)
