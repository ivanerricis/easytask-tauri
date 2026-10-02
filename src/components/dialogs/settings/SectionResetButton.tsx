import { useTranslation } from "react-i18next"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

type SectionResetButtonProps = {
    onClick: () => void
    /** Nothing to reset (everything is already at its default). */
    disabled?: boolean
    /** Tooltip: what the reset puts back. */
    title?: string
}

/** The "Ripristina tutto" button of a settings section, used for the `action` of {@link SettingsPanel} so it sits in the same place everywhere. */
export const SectionResetButton = ({ onClick, disabled, title }: SectionResetButtonProps) => {
    const { t } = useTranslation()
    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} title={title}>
            <RotateCcw />
            {t("settings.resetAll")}
        </Button>
    )
}
