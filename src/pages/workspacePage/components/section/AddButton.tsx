import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type AddButtonProps = {
    onClick?: () => void
    inGroup?: boolean
}

export const AddButton = ({ onClick, inGroup }: AddButtonProps) => {
    const { t } = useTranslation()
    return (
        <div className={`flex items-center gap-1 ${inGroup ? 'w-full' : 'w-fit'}`}>
            <Button
                type="button"
                variant="ghost"
                onClick={onClick}
                className="w-full justify-start gap-1 p-2 h-auto text-sm font-normal text-muted-foreground hover:text-foreground bg-background"
            >
                <Plus className="size-4" />
                <span className="text-nowrap">
                    {inGroup ? t("sections.new") : t("menu.newGroup")}
                </span>
            </Button>
        </div>
    )
}
