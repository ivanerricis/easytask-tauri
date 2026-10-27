import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { keyLabel } from "@/lib/shortcuts"

type PlusButtonProps = {
    disabled?: boolean
    onClick?: () => void
}

export const PlusButton = ({disabled, onClick}: PlusButtonProps) => {
    const { t } = useTranslation()
    return (
        <TooltipCustom text={t("common.add")} shortcut={keyLabel("enter")}>
            <Button
                disabled={disabled}
                type="submit"
                variant="ghost"
                size="icon"
                aria-label={t("common.add")}
                onClick={onClick}
                // flex-1, not w-full: two w-full buttons in the row would be 100% wide each in a group of automatic width
                className="h-8 flex-1 min-w-0 rounded-none text-muted-foreground hover:text-foreground"
            >
                <Plus />
            </Button>
        </TooltipCustom>
    )
}
