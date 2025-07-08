import { File } from "lucide-react"
import { ButtonMenuNote } from "./buttons/ButtonMenuNote"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import type { Note } from "@/types"

type ItemNoteProps = {
    note: Note
    className?: string
}

export const ItemNote = ({ note, className }: ItemNoteProps) => {

    const { setCurrentNotes, setCurrentNote, getNoteData } = useWorkspaceData()

    const handleOpenFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentNotes((prev: Note[]) => {
            const alreadyExists = prev.some(n => n.id === note.id)
            return alreadyExists ? prev : [...prev, note]
        })
        setCurrentNote(note)
        getNoteData(note.id)
    }

    function hexToRgba(hex: string, alpha: number) {
        const match = hex.replace('#', '').match(/.{1,2}/g)
        if (!match) return hex
        const [r, g, b] = match.map(x => parseInt(x, 16))
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    return (
        <div
            role="button"
            onClick={handleOpenFile}
            className={`group cursor-pointer relative w-full h-8 flex items-center opacity-75 bg-background hover:opacity-100 rounded-sm border transition-all overflow-x-hidden ${className}`}
            style={{ backgroundColor: `${hexToRgba(note.color, 0.5)}` }}

        >
            {/* Text + Icon */}
            <div className={`flex items-center p-1 gap-2 w-full`}>
                <File className="w-4 h-4 shrink-0 text-foreground transition-all" />
                <h1 className="text-left text-sm text-foreground transition-all w-full truncate pr-6">
                    {note.name}
                </h1>
            </div>
            <div className="flex items-center justify-center absolute right-1 gap-1">
                <ButtonMenuNote note={note} />
            </div>
        </div>
    )
}