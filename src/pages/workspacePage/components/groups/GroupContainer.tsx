import { AddSection } from "../section/AddSection"
import { useLayoutEffect, useRef } from "react"
import { Group } from "./Group"
import { useActiveNote } from "@/contexts/use-active-note"
import { useActiveNoteId, useTabUiStore } from "@/contexts/use-tabs"
import { NoteDndProvider } from "../NoteDndProvider"
import { NewGroupEnd, NewGroupSlot } from "./NewGroupSlot"
import { usePreferences } from "@/contexts/use-preferences"
import { useNoteAudioCounts } from "@/contexts/use-audio"
import { EmptyNoteHints } from "../EmptyNoteHints"

export const GroupContainer = () => {
    const { noteDataTree } = useActiveNote()
    const activeId = useActiveNoteId()
    const uiStore = useTabUiStore()
    const scrollRef = useRef<HTMLDivElement | null>(null)

    const { showAudioFileCount, showGroupSeparators } = usePreferences()
    const groups = noteDataTree?.groups
    const audioCounts = useNoteAudioCounts(activeId, showAudioFileCount)
    const hasData = groups !== undefined

    // The data is loaded by the active note provider. Here the scroll position of each note is restored
    // (once its data is rendered) and saved while scrolling, so it survives tab switches.
    useLayoutEffect(() => {
        const element = scrollRef.current
        if (!element || activeId === null || !hasData) return

        const saved = uiStore.getScroll(activeId)
        element.scrollLeft = saved?.left ?? 0
        element.scrollTop = saved?.top ?? 0

        const handleScroll = () => uiStore.setScroll(activeId, { left: element.scrollLeft, top: element.scrollTop })
        element.addEventListener("scroll", handleScroll, { passive: true })
        return () => element.removeEventListener("scroll", handleScroll)
    }, [activeId, hasData, uiStore])

    return (
        <NoteDndProvider>
        {/* flex-1 + min-h-0: a tall note must scroll here instead of squeezing the tab bar above */}
        <div className="relative flex-1 min-h-0 w-full">
        {hasData && groups.length === 0 && <EmptyNoteHints />}
        <div
            ref={scrollRef}
            className="flex w-full h-full items-start p-2 space-x-2 overflow-x-auto"
        >
            {Array.isArray(groups) && groups.length > 0 &&
                [...groups]
                    .sort((a, b) => a.position - b.position)
                    .map((group, index) => (
                        <div key={group.id} className="relative h-full w-fit">
                            {/* Vertical guide line centered in the gap (space-x-2) before every group but the first */}
                            {showGroupSeparators && index > 0 &&
                                <div data-testid="group-separator" aria-hidden className="pointer-events-none absolute -left-1 top-0 h-full w-px -translate-x-1/2 bg-border" />}
                            <NewGroupSlot index={index} />
                            <Group group={group} index={index} audioCount={audioCounts[group.id] ?? 0} />
                        </div>
                    ))}
            <NewGroupEnd index={groups?.length ?? 0}>
                <AddSection />
            </NewGroupEnd>
        </div>
        </div>
        </NoteDndProvider>
    )
}