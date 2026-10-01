import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"

type AddButtonProps = {
    onClick?: () => void
    inGroup?: boolean
}

export const AddButton = ({ onClick, inGroup }: AddButtonProps) => {
    const { t } = useTranslation()
    return (
        <div className={`flex items-center gap-1 ${inGroup ? 'w-full' : 'w-fit'}`}>
            <button
                type="button"
                onClick={onClick}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer flex items-center justify-start w-full border border-transparent rounded-xs hover:border-solid hover:border-accent gap-1 p-2 bg-background"
            >
                <Plus className="group-hover:text-foreground text-muted-foreground size-4" />
                <span className="text-muted-foreground group-hover:text-foreground text-nowrap text-sm">
                    {inGroup ? t("sections.new") : t("menu.newGroup")}
                </span>
            </button>
        </div>
    )
}
