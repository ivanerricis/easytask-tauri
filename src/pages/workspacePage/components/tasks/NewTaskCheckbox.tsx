import { cn } from "@/lib/utils"

/** Inert placeholder in the exact spot (and look) of a real task checkbox, for the field of a new task. */
export const NewTaskCheckbox = ({ className }: { className?: string }) => (
    <span aria-hidden className={cn("size-4 shrink-0 rounded-xs border border-input opacity-50", className)} />
)
