import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import type { Note } from "@/types/types"
import { X } from "lucide-react"
import React, { useCallback, useEffect } from "react"

type NoteHeaderProps = {
    note: Note
}

export const NoteHeader = ({ note }: NoteHeaderProps) => {

    const { setCurrentNotes, setCurrentNote, currentNote, currentNotes } = useWorkspaceData()

    const handleCloseSpecificNote = useCallback((noteIdToClose: number) => {
        const updatedNotes = currentNotes.filter(n => n.id !== noteIdToClose);
        setCurrentNotes(updatedNotes);

        if (updatedNotes.length > 0) {
            const closedNoteIndex = currentNotes.findIndex(n => n.id === noteIdToClose);

            if (closedNoteIndex === updatedNotes.length) {
                setCurrentNote(updatedNotes[updatedNotes.length - 1]);
            } else {
                setCurrentNote(updatedNotes[closedNoteIndex]);
            }
        } else {
            setCurrentNote(null);
        }
    }, [currentNotes, setCurrentNotes, setCurrentNote]);

    useEffect(() => {
        const handleKeyDownGlobal = (e: KeyboardEvent) => {
            if (e.key === "l" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (currentNote) {
                    handleCloseSpecificNote(currentNote.id);
                }
            }
        }
        document.addEventListener("keydown", handleKeyDownGlobal);
        return () => document.removeEventListener("keydown", handleKeyDownGlobal);
    }, [currentNote, handleCloseSpecificNote]);

    const handleCloseHeader = (e: React.MouseEvent) => {
        e.stopPropagation()
        handleCloseSpecificNote(note.id);
    }

    const setCurrent = (e: React.MouseEvent) => {
        e.stopPropagation()
        setCurrentNote(note)
    }

    return (
        <div
            role="button"
            onClick={setCurrent}
            className={`relative flex flex-col items-center cursor-pointer
                ${currentNote?.id === note.id ? 'bg-background' : 'bg-secondary hover:bg-background/40'}`}
        >
            {/* Color container */}
            {note.color && <div
                className="w-full h-0.5 absolute top-0"
                style={{
                    backgroundColor: currentNote?.id === note.id ? note.color : 'var(--background-color)'
                }}
            >
            </div>}

            {/* Text + Close button */}
            <div className="flex items-center justify-between pb-1 pt-1.5 pl-2 pr-1 gap-2 h-full">
                <h1 className={`w-full text-left text-sm text-nowrap ${currentNote?.id === note.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {note.name}
                </h1>
                {(currentNote?.id === note.id) ?
                    <TooltipCustom text="Chiudi nota corrente" shortcut="(Ctrl + L)">
                        <button onClick={handleCloseHeader} className={`flex items-center justify-center cursor-pointer p-0.5 hover:bg-accent rounded-xs
                    ${currentNote?.id === note.id ? "text-foreground" : "text-muted-foreground"}`}>
                            <X className="h-4 w-4" />
                        </button>
                    </TooltipCustom>
                    :
                    <TooltipCustom text="Chiudi nota">
                        <button onClick={handleCloseHeader} className={`flex items-center justify-center cursor-pointer p-0.5 hover:bg-accent rounded-xs
                    ${currentNote?.id === note.id ? "text-foreground" : "text-muted-foreground"}`}>
                            <X className="h-4 w-4" />
                        </button>
                    </TooltipCustom>
                }
            </div>
        </div>
    )
}