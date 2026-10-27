import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { useSelectedTaskKeys } from "./task-selection-context"

/**
 * Shows how many tasks are selected once there are 2 or more (a lone selected task is not a multi-selection). The status
 * region stays mounted so that the change of the count is announced politely.
 */
export function TaskSelectionBar() {
    const { t } = useTranslation()
    const count = useSelectedTaskKeys().size

    return (
        <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
            {count >= 2 &&
                <Badge data-testid="selection-count" variant="default" className="px-3 py-1 text-sm tabular-nums shadow-md">
                    {t("tasks.selection.count", { count })}
                </Badge>}
        </div>
    )
}
