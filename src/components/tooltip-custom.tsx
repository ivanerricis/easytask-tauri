import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

/**
 * Offset of the tooltip from the element it describes. The arrow adds about 5px, so the tip of the arrow ends about 3px
 * from the element: close to it without touching it.
 */
const TOOLTIP_OFFSET = -2

type TooltipCustomProps = {
    children: React.ReactNode
    shortcut?: string
    text?: string | string[]
    side?: "top" | "bottom" | "right" | "left"
    sideOffset?: number
}

export const TooltipCustom = ({ children, text, shortcut, side, sideOffset }: TooltipCustomProps) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            {text && <TooltipContent side={side ?? "top"} sideOffset={sideOffset ?? TOOLTIP_OFFSET}>
                <div className="flex flex-col items-center justify-center w-full">
                    <div className="flex flex-col">
                        {Array.isArray(text)
                            ? text.map((line, index) => <p key={index}>{line}</p>)
                            : <p>{text}</p>
                        }
                    </div>
                    {shortcut && <p>{shortcut}</p>}
                </div>
            </TooltipContent>}
        </Tooltip>
    )
}