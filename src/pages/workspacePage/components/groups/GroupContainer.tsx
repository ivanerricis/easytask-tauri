import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import { AddSection } from "../section/AddSection"
import { useLayoutEffect, useRef } from "react"
import { Group } from "./Group"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNote, useActiveNoteActions } from "@/contexts/active-note-context"
import { useActiveNoteId, useTabUiStore } from "@/contexts/tabs-context"
import { NoteDndProvider } from "../NoteDndProvider"
import { NewGroupEnd, NewGroupSlot } from "./NewGroupSlot"
import { EmptyNoteHints } from "../EmptyNoteHints"

export const GroupContainer = () => {
    const { updateGroupsPositions } = useWorkspaceActions()
    const { noteDataTree } = useActiveNote()
    const { setNoteDataTree } = useActiveNoteActions()
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

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination || !groups) return
        if (result.source.index === result.destination.index) return

        const items = [...groups].sort((a, b) => a.position - b.position)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        const updatedGroups = items.map((group, index) => ({
            ...group,
            position: index
        }))

        setNoteDataTree({ groups: updatedGroups })

        try {
            await updateGroupsPositions(updatedGroups)
        } catch (error) {
            console.error("Errore durante l'aggiornamento delle posizioni dei gruppi:", error)
            setNoteDataTree(noteDataTree)
        }
    }

    return (
        <NoteDndProvider>
        <div className="relative w-full h-full">
        {hasData && groups.length === 0 && <EmptyNoteHints />}
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="groups" direction="horizontal">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={node => {
                            provided.innerRef(node)
                            scrollRef.current = node
                        }}
                        className="flex w-full h-full items-start p-2 space-x-2 overflow-x-auto"
                    >
                        {Array.isArray(groups) && groups.length > 0 &&
                            [...groups]
                                .sort((a, b) => a.position - b.position)
                                .map((group, index) => (
                                    <Draggable key={group.id} draggableId={String(group.id)} index={index}>
                                        {(provided) => (
                                            <div
                                                className="relative h-full w-fit"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                style={{
                                                    ...provided.draggableProps.style
                                                }}
                                            >
                                                <NewGroupSlot index={index} />
                                                <Group dragHandleProps={provided.dragHandleProps} group={group} index={index} />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                        {provided.placeholder}
                        <NewGroupEnd index={groups?.length ?? 0}>
                            <AddSection />
                        </NewGroupEnd>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
        </div>
        </NoteDndProvider>
    )
}