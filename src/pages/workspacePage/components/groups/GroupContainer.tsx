import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import { AddSection } from "../section/AddSection"
import { useEffect } from "react"
import { Group } from "./Group"
import { useWorkspaceData } from "@/contexts/workspace-data-context"

export const GroupContainer = () => {
    const { getNoteData, updateGroupsPositions, currentNote, noteDataTree, setGroups } = useWorkspaceData()

    const groups = noteDataTree?.groups

    useEffect(() => {
        const fetchNoteData = async () => {
            if (!currentNote) return
            await getNoteData(currentNote.id)
        }
        fetchNoteData()
    }, [currentNote])

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination || !groups) return
        if (result.source.index === result.destination.index) return

        const items = Array.from(groups)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        const updatedGroups = items.map((group, index) => ({
            ...group,
            position: index
        }))

        setGroups(updatedGroups)

        try {
            await updateGroupsPositions(updatedGroups)
        } catch (error: any) {
            console.error("Errore durante l'aggiornamento delle posizioni dei gruppi:", error)
            setGroups(groups)
        }
    }

    return (
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
                                                className="h-full w-fit"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                style={{
                                                    ...provided.draggableProps.style
                                                }}
                                            >
                                                <Group dragHandleProps={provided.dragHandleProps} group={group} />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                        {provided.placeholder}
                        <AddSection />
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}