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
                className="h-8 w-full rounded-none text-muted-foreground hover:text-foreground"
            >
                <Plus />
            </Button>
        </TooltipCustom>
    )
}
