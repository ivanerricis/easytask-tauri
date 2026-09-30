import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import { AddSection } from "../section/AddSection"
import { useEffect } from "react"
import { Group } from "./Group"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { NoteDndProvider } from "../NoteDndProvider"
import { NewGroupEnd, NewGroupSlot } from "./NewGroupSlot"

export const GroupContainer = () => {
    const { getNoteData, updateGroupsPositions, currentNote, noteDataTree, setNoteDataTree } = useWorkspaceData()

    const groups = noteDataTree?.groups

    useEffect(() => {
        if (!currentNote) return
        getNoteData(currentNote.id).catch(console.error)
    }, [currentNote, getNoteData])

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
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="groups" direction="horizontal">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
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
                                                <Group dragHandleProps={provided.dragHandleProps} group={group} />
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
        </NoteDndProvider>
    )
}