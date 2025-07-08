import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { NoteHeader } from "./NoteHeader"
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"

export const NoteList = () => {

    const { currentNotes, setCurrentNotes, setCurrentNote } = useWorkspaceData()

    const handleOnDragEnd = (result: DropResult) => {
        const { destination, source } = result;

        if (!destination) return;

        if (destination.index === source.index) return;

        const updatedNotes = Array.from(currentNotes);
        const [removed] = updatedNotes.splice(source.index, 1);
        updatedNotes.splice(destination.index, 0, removed);

        setCurrentNotes(updatedNotes);
        const newCurrentNote = updatedNotes[destination.index]
        setCurrentNote(newCurrentNote)
    }

    return (
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="notes" direction="horizontal">
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex w-full overflow-x-auto bg-background"
                    >
                        {currentNotes.map((note, index) => (
                            <Draggable key={note.id} draggableId={note.id.toString()} index={index}>
                                {(provided) => (
                                    <div className="flex"
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