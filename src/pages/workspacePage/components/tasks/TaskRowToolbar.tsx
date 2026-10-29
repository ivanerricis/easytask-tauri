import { useTranslation } from "react-i18next"
import { AlignLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ItemMenuButton } from "@/components/item-menu"
import { TooltipCustom } from "@/components/tooltip-custom"

type TaskRowToolbarProps = {
    taskText: string
    hasDescription: boolean
    /** Tab index of the buttons: undefined on the tab stop of the list, -1 on the other rows. */
    inner: number | undefined
    onOpenDescription: () => void
    onAddSubtask: () => void
}

/** The buttons that show on hover (or with the focus inside): description, new subtask and the menu of the task. */
export function TaskRowToolbar({ taskText, hasDescription, inner, onOpenDescription, onAddSubtask }: TaskRowToolbarProps) {
    const { t } = useTranslation()
    return (
        <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute top-1 right-1 rounded-xs bg-secondary">
            {hasDescription &&
                <TooltipCustom text={t("tasks.showDescription")}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("tasks.showDescription")}
                        tabIndex={inner}
                        onClick={onOpenDescription}
                        className="size-6">
                        <AlignLeft />
                    </Button>
                </TooltipCustom>}
            <TooltipCustom text={t("tasks.addSubtask")}>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("tasks.addSubtask")}
                    tabIndex={inner}
                    onClick={onAddSubtask}
                    className="size-6">
                    <Plus />
                </Button>
            </TooltipCustom>
            <ItemMenuButton name={taskText} tabIndex={inner} />
        </div>
    )
}
