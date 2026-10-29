import { useCallback, useEffect, useRef, useState } from "react"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { useIsSplit } from "@/contexts/use-layout"
import { PaneProvider } from "@/contexts/pane-provider"
import { DEFAULT_SPLIT_RATIO, clampRatio } from "@/lib/split-layout"
import { getSplitRatio, saveSplitRatio } from "@/lib/store/split"
import { GroupContainer } from "./groups/GroupContainer"
import { NoteList } from "./note/NoteList"
import { TabsDndProvider } from "./note/TabsDndProvider"
import { BlankNote } from "./BlankNote"
import { PaneDivider } from "./PaneDivider"
import { PathBar } from "./PathBar"
import { SplitPane } from "./SplitPane"
import { NoteSearchProvider } from "./note-search-context"

/** The single pane: exactly the centre of the workspace as it is without the split. */
const SinglePane = () => {
    const activeId = useActiveNoteId()

    return (
        <div className="flex flex-col w-full min-w-0 overflow-hidden relative">
            {activeId !== null && <NoteList />}
            {activeId !== null
                ? <NoteSearchProvider><PathBar /><GroupContainer /></NoteSearchProvider>
                : <BlankNote />}
        </div >
    )
}

/** The two panes side by side with their divider; the ratio is global and remembered. */
const SplitPanes = () => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [ratio, setRatio] = useState(DEFAULT_SPLIT_RATIO)
    const [width, setWidth] = useState<number | null>(null)
    const touched = useRef(false)

    // The saved ratio is loaded once, unless the user already moved the divider in the meantime
    useEffect(() => {
        let cancelled = false
        void getSplitRatio().then(saved => { if (!cancelled && !touched.current) setRatio(saved) }).catch(() => {})
        return () => { cancelled = true }
    }, [])

    // The panes keep their minimum width when the window shrinks
    useEffect(() => {
        const element = containerRef.current
        if (!element) return
        setWidth(element.getBoundingClientRect().width)
        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver(([entry]) => {
            const next = entry.contentRect.width
            setWidth(current => current === next ? current : next)
        })
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    const effective = clampRatio(ratio, width ?? Infinity)
    const change = useCallback((next: number) => { touched.current = true; setRatio(next) }, [])
    const commit = useCallback((next: number) => { void saveSplitRatio(next).catch(() => {}) }, [])

    return (
        <div ref={containerRef} className="flex w-full min-w-0 overflow-hidden">
            <PaneProvider pane={0}><SplitPane pane={0} share={effective} /></PaneProvider>
            <PaneDivider ratio={effective} containerRef={containerRef} containerWidth={width ?? Infinity} onRatioChange={change} onRatioCommit={commit} />
            <PaneProvider pane={1}><SplitPane pane={1} share={1 - effective} /></PaneProvider>
        </div>
    )
}

/** The centre of the workspace: one pane, or two side by side (with their divider) when the workspace is split. */
export const CenterContainer = () => {
    const isSplit = useIsSplit()

    if (!isSplit) return <PaneProvider pane={0}><SinglePane /></PaneProvider>
    return <TabsDndProvider><SplitPanes /></TabsDndProvider>
}
