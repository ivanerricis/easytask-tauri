import type { ReactNode } from "react"
import { TooltipCustom } from "@/components/tooltip-custom"
import { Button } from "@/components/ui/button"

type SidebarIconButtonProps = {
    label: string
    icon: ReactNode
    onClick: () => void
    disabled?: boolean
}

/** Icon button of the sidebar header, whose tooltip also shows when the button is disabled. */
export const SidebarIconButton = ({ label, icon, onClick, disabled }: SidebarIconButtonProps) => (
    <TooltipCustom text={label}>
        {/* The span keeps the tooltip when the button is disabled (a disabled button gets no pointer events) */}
        <span className="inline-flex">
            <Button variant="buttonIcon" size="icon" disabled={disabled} onClick={onClick} aria-label={label}>
                {icon}
            </Button>
        </span>
    </TooltipCustom>
)
