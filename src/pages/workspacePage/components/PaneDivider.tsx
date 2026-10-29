import { useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react"
import { useTranslation } from "react-i18next"
import { focusRing } from "@/lib/a11y"
import { DEFAULT_SPLIT_RATIO, clampRatio, ratioForKey } from "@/lib/split-layout"
import { cn } from "@/lib/utils"

type PaneDividerProps = {
    /** Share of the container width given to the left pane. */
    ratio: number
    /** The element that holds the two panes (its box is what the ratio refers to). */
    containerRef: RefObject<HTMLElement | null>
    /** Width in pixels of the container (Infinity until measured): it sets the range exposed to assistive technologies and the keyboard limits. */
    containerWidth: number
    /**
     * Called with every new ratio, while dragging too: the parent should only paint it (e.g. write a CSS variable), not store it in React
     * state, so the panes are not re-rendered on every pointer move.
     */
    onRatioChange: (ratio: number) => void
    /** Called with the final ratio when a change is over (end of a drag, key press, reset): the moment to save it. */
    onRatioCommit: (ratio: number) => void
}

/** The resizable divider between the two panes: pointer drag, arrow keys (Shift = larger step), Home/End, double click to reset. */
export const PaneDivider = ({ ratio, containerRef, containerWidth, onRatioChange, onRatioCommit }: PaneDividerProps) => {
    const { t } = useTranslation()
    const [dragging, setDragging] = useState(false)
    const dragRatioRef = useRef<number | null>(null)
    // The value read by assistive technologies follows the drag without waiting for the commit (a state of this tiny component only)
    const [dragPercent, setDragPercent] = useState<number | null>(null)

    const percent = dragPercent ?? Math.round(ratio * 100)

    // The divider captures the pointer, so move and up events keep coming to it even outside its few pixels
    const startDragging = (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRatioRef.current = ratio
        setDragging(true)
    }

    const drag = (e: PointerEvent<HTMLDivElement>) => {
        if (dragRatioRef.current === null || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        if (rect.width <= 0) return
        const next = clampRatio((e.clientX - rect.left) / rect.width, rect.width)
        dragRatioRef.current = next
        setDragPercent(Math.round(next * 100))
        onRatioChange(next)
    }

    const stopDragging = () => {
        const final = dragRatioRef.current
        if (final === null) return
        dragRatioRef.current = null
        setDragging(false)
        setDragPercent(null)
        onRatioCommit(final)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const next = ratioForKey(e.key, ratio, containerWidth, e.shiftKey)
        if (next === null) return
        e.preventDefault()
        if (next === ratio) return
        onRatioChange(next)
        onRatioCommit(next)
    }

    const reset = () => {
        onRatioChange(DEFAULT_SPLIT_RATIO)
        onRatioCommit(DEFAULT_SPLIT_RATIO)
    }

    const min = Math.round(clampRatio(0, containerWidth) * 100)

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("notes.split.divider")}
            aria-valuemin={min}
            aria-valuemax={100 - min}
            aria-valuenow={percent}
            aria-valuetext={t("notes.split.dividerValue", { percent })}
            tabIndex={0}
            className={cn(
                focusRing, "focus-visible:ring-inset relative w-1.5 shrink-0 cursor-col-resize touch-none border-x bg-border/40",
                "before:absolute before:inset-y-0 before:-inset-x-1 before:content-[''] hover:bg-accent",
                dragging && "bg-accent",
            )}
            onPointerDown={startDragging}
            onPointerMove={drag}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onDoubleClick={reset}
            onKeyDown={handleKeyDown}
        />
    )
}
