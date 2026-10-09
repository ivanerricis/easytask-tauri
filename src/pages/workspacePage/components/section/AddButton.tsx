import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type AddButtonProps = {
    onClick?: () => void
    inGroup?: boolean
}

export const AddButton = ({ onClick, inGroup }: AddButtonProps) => {
    const { t } = useTranslation()
    const label = inGroup ? t("sections.new") : t("menu.newGroup")
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`${inGroup ? 'w-full' : 'w-fit px-4'} h-9 rounded-xs border border-dashed border-muted-foreground/45 hover:border-foreground/60 font-normal text-muted-foreground hover:text-foreground`}
        >
            <Plus />
            <span className="text-nowrap">{label}</span>
        </Button>
    )
}
