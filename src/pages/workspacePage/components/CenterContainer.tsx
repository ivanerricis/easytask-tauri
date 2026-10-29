import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useIsSplit } from "@/contexts/use-layout"
import { PaneProvider } from "@/contexts/pane-provider"
import { DEFAULT_SPLIT_RATIO, clampRatio } from "@/lib/split-layout"
import { getSplitRatio, saveSplitRatio } from "@/lib/store/split"
import { TabsDndProvider } from "./note/TabsDndProvider"
import { PaneDivider } from "./PaneDivider"
import { SplitPane } from "./SplitPane"

const RATIO_VAR = "--split-ratio"

/**
 * The panes with their divider. The tree has the same shape split or not (the left pane is always the same element at the same
 * position, the divider and the right pane are added after it), so splitting or closing the split does not remount the left pane.
 * The ratio (global, remembered) reaches the panes as the `--split-ratio` CSS variable of the container: a drag only rewrites the
 * variable (once per frame) and commits the React state and the saved value when it ends, so the panes are not re-rendered while it moves.
 */
const Panes = ({ isSplit }: { isSplit: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [ratio, setRatio] = useState(DEFAULT_SPLIT_RATIO)
    const [width, setWidth] = useState<number | null>(null)
    const touched = useRef(false)
    const pending = useRef<number | null>(null)
    const frame = useRef(0)

    // The saved ratio is loaded each time the workspace is split, unless the user already moved the divider in the meantime
    useEffect(() => {
        if (!isSplit) return
        touched.current = false
        let cancelled = false
        void getSplitRatio().then(saved => { if (!cancelled && !touched.current) setRatio(saved) }).catch(() => {})
        return () => { cancelled = true }
    }, [isSplit])

    // The panes keep their minimum width when the window shrinks
    useEffect(() => {
        const element = containerRef.current
        if (!isSplit || !element) return
        setWidth(element.getBoundingClientRect().width)
        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(([entry]) => {
            const next = entry.contentRect.width
            setWidth(current => current === next ? current : next)
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [isSplit])

    const effective = clampRatio(ratio, width ?? Infinity)
    useLayoutEffect(() => {
        if (isSplit) containerRef.current?.style.setProperty(RATIO_VAR, String(effective))
    }, [isSplit, effective])

    const cancelFrame = () => {
        if (frame.current) cancelAnimationFrame(frame.current)
        frame.current = 0
        pending.current = null
    }
    useEffect(() => cancelFrame, [])

    // While dragging: only the CSS variable changes, at most once per frame
    const change = useCallback((next: number) => {
        touched.current = true
        pending.current = next
        if (frame.current) return
        frame.current = requestAnimationFrame(() => {
            frame.current = 0
            if (pending.current !== null) containerRef.current?.style.setProperty(RATIO_VAR, String(pending.current))
            pending.current = null
        })
    }, [])
    const commit = useCallback((next: number) => {
        cancelFrame()
        containerRef.current?.style.setProperty(RATIO_VAR, String(next))
        setRatio(next)
        void saveSplitRatio(next).catch(() => {})
    }, [])

    return (
        <div ref={containerRef} className="flex w-full min-w-0 overflow-hidden">
            <PaneProvider pane={0}><SplitPane pane={0} split={isSplit} /></PaneProvider>
            {isSplit && <PaneDivider ratio={effective} containerRef={containerRef} containerWidth={width ?? Infinity} onRatioChange={change} onRatioCommit={commit} />}
            {isSplit && <PaneProvider pane={1}><SplitPane pane={1} split /></PaneProvider>}
        </div>
    )
}

/** The centre of the workspace: one pane, or two side by side (with their divider) when the workspace is split. */
export const CenterContainer = () => {
    const isSplit = useIsSplit()
    return <TabsDndProvider split={isSplit}><Panes isSplit={isSplit} /></TabsDndProvider>
}
