import { useTabs, useTabsActions } from "@/contexts/tabs-context"
import { NoteHeader } from "./NoteHeader"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"

export const NoteList = () => {

    const { tabs } = useTabs()
    const { reorderTabs } = useTabsActions()

    const handleOnDragEnd = (result: DropResult) => {
        const { destination, source } = result;

        if (!destination) return;

        if (destination.index === source.index) return;

        reorderTabs(source.index, destination.index)
    }

    return (
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="notes" direction="horizontal">
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex w-full overflow-x-auto overflow-y-hidden bg-secondary divide-x-1"
                    >
                        {tabs.map((note, index) => (
                            <Draggable key={note.id} draggableId={note.id.toString()} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                    >
                                        <NoteHeader note={note} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}