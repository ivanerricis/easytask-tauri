import { useTranslation } from "react-i18next"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipCustom } from "@/components/tooltip-custom"
import { keyLabel } from "@/lib/shortcuts"

type CloseButtonProps = {
    onClick?: () => void
}

export const CloseButton = ({onClick}: CloseButtonProps) => {
    const { t } = useTranslation()
    return (
        <TooltipCustom text={t("common.cancel")} shortcut={keyLabel("escape")}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("common.cancel")}
                onClick={onClick}
                className="h-8 w-full rounded-none text-muted-foreground hover:text-foreground"
            >
                <X />
            </Button>
        </TooltipCustom>
    )
}
