import { useTranslation } from "react-i18next"
import { X } from "lucide-react"

type CloseButtonProps = {
    onClick?: () => void
}

export const CloseButton = ({onClick}: CloseButtonProps) => {
    const { t } = useTranslation()
    return (
        <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={onClick}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group/close cursor-pointer flex items-center justify-center w-full h-8"
        >
            <X size={20} className="group-hover/close:text-foreground text-muted-foreground" />
        </button>
    )
}