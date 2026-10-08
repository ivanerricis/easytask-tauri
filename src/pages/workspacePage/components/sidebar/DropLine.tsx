import { cn } from "@/lib/utils"
import type { DropZone } from "./tree-dnd"

type DropLineProps = {
    zone: DropZone | null
    /** Pushes the line outside the row by 1px (rows with a border), instead of drawing it inside. */
    outside?: boolean
    /** Vertical bar on the left/right edge instead of a horizontal line on the top/bottom one (rows laid out in a line). */
    vertical?: boolean
    className?: string
}

/** Insertion line (before/after) drawn inside a row. */
export const DropLine = ({ zone, outside, vertical, className }: DropLineProps) => {
    if (zone !== "before" && zone !== "after") return null
    const before = zone === "before"
    return (
        <div
            className={cn(
                "pointer-events-none absolute z-10 bg-primary",
                vertical
                    ? cn("top-0 bottom-0 w-0.5", before ? (outside ? "-left-px" : "left-0") : (outside ? "-right-px" : "right-0"))
                    : cn("left-0 right-0 h-0.5", before ? (outside ? "-top-px" : "top-0") : (outside ? "-bottom-px" : "bottom-0")),
                className,
            )}
        />
    )
}
