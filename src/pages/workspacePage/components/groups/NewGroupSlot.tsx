import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useNoteDrop } from "../note-dnd-state"

type NewGroupSlotProps = {
    /** Index of the new group among the current groups (groups.length = at the end). */
    index: number
}

/**
 * Thin drop slot on the left edge of a group: a section dropped here becomes a new group placed before it.
 * It is always mounted (so dnd-kit keeps its rect measured) but it is invisible and does not catch pointer events
 * unless a section is being dragged.
 * @category Note DnD
 */
export const NewGroupSlot = ({ index }: NewGroupSlotProps) => {
    const { setNodeRef, zone, active } = useNoteDrop("new-group", index)
    const dragging = active?.kind === "section"

    return (
        <div
            ref={setNodeRef}
            aria-hidden
            className={cn(
                "pointer-events-none absolute -left-2 top-0 z-20 h-full w-4 rounded-full transition-colors",
                dragging && "bg-primary/15",
                dragging && zone && "bg-primary",
            )}
        />
    )
}

type NewGroupEndProps = {
    /** Index of the new group: the number of groups (it is created after the last one). */
    index: number
    children: ReactNode
}

/**
 * Column at the end of the groups (holding the "Nuova sezione" button): a section dropped on it
 * becomes a new last group.
 * @category Note DnD
 */
export const NewGroupEnd = ({ index, children }: NewGroupEndProps) => {
    const { t } = useTranslation()
    const { setNodeRef, zone, active } = useNoteDrop("new-group", index)
    const dragging = active?.kind === "section"

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative flex h-full min-w-44 flex-col rounded-xs",
                dragging && "border border-dashed border-primary/50",
                dragging && zone && "border-solid bg-primary/10 ring-2 ring-primary",
            )}
        >
            {children}
            {dragging &&
                <span className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-xs text-muted-foreground">
                    {t("menu.newGroup")}
                </span>}
        </div>
    )
}
