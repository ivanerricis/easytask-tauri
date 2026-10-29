import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type AddButtonProps = {
    onClick?: () => void
    /** Text of the button; the default is the "new section" one. */
    label?: string
}

export const AddButton = ({ onClick, label }: AddButtonProps) => {
    const { t } = useTranslation()
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            className="w-full h-9 rounded-xs border border-dashed border-muted-foreground/45 hover:border-foreground/60 font-normal text-muted-foreground hover:text-foreground"
        >
            <Plus />
            <span className="text-nowrap">{label ?? t("sections.new")}</span>
        </Button>
    )
}
