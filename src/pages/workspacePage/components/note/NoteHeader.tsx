import { useWorkspaceData } from "@/contexts/workspace-data-context"
import type { Note } from "@/types/types"
import { X } from "lucide-react"
import React from "react"

type NoteHeaderProps = {
    note: Note
}

export const NoteHeader = ({ note }: NoteHeaderProps) => {

    const { setCurrentNotes, setCurrentNote, currentNote, currentNotes } = useWorkspaceData()

    const handleCloseHeader = (e: React.MouseEvent) => {
        e.stopPropagation()

        const updatedNotes = currentNotes.filter(n => n.id !== note.id)
        setCurrentNotes(updatedNotes)

        if (updatedNotes.length > 0) {
            const currentIndex = currentNotes.findIndex(n => n.id === note.id)

            if (currentIndex === updatedNotes.length) {
                setCurrentNote(updatedNotes[currentIndex - 1])
            } else {
                setCurrentNote(updatedNotes[currentIndex])
            }
        } else {
            setCurrentNote(null)
        }
    }

    const setCurrent = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentNote(note)
    }

    return (
        <div
            role="button"
            onClick={setCurrent}
            className={`relative flex flex-col items-center cursor-pointer border-r ${currentNote?.id === note.id ? 'bg-background' : 'bg-secondary hover:bg-background/40'}`}
        >
            {/* Color container */}
            <div
                className="w-full h-0.5 absolute top-0"
                style={{
                    backgroundColor: currentNote?.id === note.id ? note.color : 'var(--background-color)'
                }}
            >
            </div>

            {/* Text + Close button */}
            <div className="flex items-center justify-between pb-1 pt-2 pl-2 pr-1 gap-2 h-full">
                <h1 className={`w-full text-left text-sm text-nowrap ${currentNote?.id === note.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {note.name}
                </h1>
                <button onClick={handleCloseHeader} className={`flex items-center justify-center cursor-pointer p-0.5 hover:bg-accent rounded-xs
                    ${currentNote?.id === note.id ? "text-foreground" : "text-muted-foreground"}`}>
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}