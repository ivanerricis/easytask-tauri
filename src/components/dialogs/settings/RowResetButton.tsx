import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"

type RowResetButtonProps = {
    /** Name and tooltip of the button: what the reset puts back. */
    label: string
    onClick: () => void
    /** Already at the default. */
    disabled?: boolean
}

/** Icon button that puts one setting back to its default, next to its control (the pattern of every row with a reset). */
export const RowResetButton = ({ label, onClick, disabled }: RowResetButtonProps) => (
    <TooltipCustom text={label}>
        {/* A disabled button gets no pointer events: the span keeps the tooltip working */}
        <span>
            <Button variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick}>
                <RotateCcw />
            </Button>
        </span>
    </TooltipCustom>
)
