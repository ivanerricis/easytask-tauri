import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import { AddSection } from "../section/AddSection"
import { useEffect } from "react"
import { Group } from "./Group"
import { useWorkspaceData } from "@/contexts/workspace-data-context"

export const GroupContainer = () => {
    const { getNoteData, UpdateGroupsPositions, currentNote, groups, setGroups } = useWorkspaceData()

    useEffect(() => {
        const fetchNoteData = async () => {
            if (!currentNote) return
            await getNoteData(currentNote.id)
        }

        fetchNoteData()
    }, [currentNote])

    const handleOnDragEnd = async (result: DropResult) => {
        if (!result.destination || !groups) return

        const items = Array.from(groups)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        const updatedGroups = items.map((group, index) => ({
            ...group,
            position: index
        }))

        setGroups(updatedGroups)

        try {
            await UpdateGroupsPositions(updatedGroups)
            if (currentNote)
                await getNoteData(currentNote?.id)
        } catch (error: any) {
            console.error("Errore durante l'aggiornamento delle posizioni dei gruppi:", error)
            setGroups(groups)
        }
    }

    return (
        <>
            <div className="flex items-start justify-start h-full overflow-x-auto overflow-y-auto bg-background">
                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="groups" direction="horizontal">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex items-start p-2"
                            >
                                {Array.isArray(groups) && groups.length > 0 &&
                                    groups.map((group, index) => (
                                        <Draggable key={group.id} draggableId={String(group.id)} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        marginRight: "8px"
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
            </div>
        </>
    )
}