import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

type TooltipCustomProps = {
    children: React.ReactNode
    shortcut?: string
    text?: string | string[]
    side?: "top" | "bottom" | "right" | "left"
    sideOffset?: number
}

export const TooltipCustom = ({ children, text, shortcut, side, sideOffset }: TooltipCustomProps) => {
    return (
        <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            {text && <TooltipContent side={side ?? "top"} sideOffset={sideOffset ?? -5} className="border-background border-1">
                <div className="flex flex-col items-center justify-center w-full">
                    <div className="flex flex-col">
                        {Array.isArray(text)
                            ? text.map((line, index) => <p key={index}>{line}</p>)
                            : <p>{text}</p>
                        }
                    </div>
                    <p>{shortcut}</p>
                </div>
            </TooltipContent>}
        </Tooltip>
    )
}