import type { DropZone } from "./tree-dnd"

/** Insertion line (before/after) drawn inside a row. */
export const DropLine = ({ zone }: { zone: DropZone | null }) => {
    if (zone !== "before" && zone !== "after") return null
    return (
        <div
            className={`pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-primary ${zone === "before" ? "top-0" : "bottom-0"}`}
        />
    )
}
