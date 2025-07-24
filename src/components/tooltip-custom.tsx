import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

type TooltipCustomProps = {
    children: React.ReactNode
    shortcut?: string
    text?: string
}

export const TooltipCustom = ({ children, text, shortcut }: TooltipCustomProps) => {
    return (
        <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            {text && <TooltipContent>
                <div className="flex flex-col items-center justify-center">
                    <p>{text}</p>
                    <p>{shortcut}</p>
                </div>
            </TooltipContent>}
        </Tooltip>
    )
}