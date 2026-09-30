import { AddSection } from "../section/AddSection"
import { useLayoutEffect, useRef } from "react"
import { Group } from "./Group"
import { useActiveNote } from "@/contexts/active-note-context"
import { useActiveNoteId, useTabUiStore } from "@/contexts/tabs-context"
import { NoteDndProvider } from "../NoteDndProvider"
import { NewGroupEnd, NewGroupSlot } from "./NewGroupSlot"
import { EmptyNoteHints } from "../EmptyNoteHints"

export const GroupContainer = () => {
    const { noteDataTree } = useActiveNote()
    const activeId = useActiveNoteId()
    const uiStore = useTabUiStore()
    const scrollRef = useRef<HTMLDivElement | null>(null)

    const groups = noteDataTree?.groups
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
        <div className="relative w-full h-full">
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
                            <NewGroupSlot index={index} />
                            <Group group={group} index={index} />
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