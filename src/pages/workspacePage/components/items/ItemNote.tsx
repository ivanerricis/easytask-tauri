import { File } from "lucide-react"
import { ButtonMenuNote } from "./buttons/ButtonMenuNote"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import type { Note } from "@/types"
import { useState } from "react"

type ItemNoteProps = {
    note: Note
    className?: string
}

export const ItemNote = ({ note, className }: ItemNoteProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const { setCurrentNotes, setCurrentNote, getNoteData } = useWorkspaceData()

    const handleOpenFile = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await getNoteData(note.id)
        setCurrentNotes((prev: Note[]) => {
            const alreadyExists = prev.some(n => n.id === note.id)
            return alreadyExists ? prev : [...prev, note]
        })
        setCurrentNote(note)
    }

    function hexToRgba(alpha: number, hex?: string) {
        const match = hex?.replace('#', '').match(/.{1,2}/g)
        if (!match) return hex
        const [r, g, b] = match.map(x => parseInt(x, 16))
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    return (
        <div
            role="button"
            onClick={handleOpenFile}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group cursor-pointer relative w-full h-7 flex items-center opacity-85 bg-background hover:opacity-100 rounded-xs border transition duration-75 overflow-x-hidden ${className}`}
            style={{ backgroundColor: `${hexToRgba(isHovered ? 0.8 : 0.5, note.color)}` }}

        >
            {/* Text + Icon */}
            <div className={`flex items-center px-1 gap-2 w-full`}>
                <File className="w-4 h-4 shrink-0 text-foreground transition-all" />
                <h1 className="text-left text-sm text-foreground transition-all w-full truncate pr-6">
                    {note.name}
                </h1>
            </div>
            <div className="flex items-center justify-center absolute right-1 gap-1 opacity-0 group-hover:opacity-100">
                <ButtonMenuNote note={note} />
            </div>
        </div>
    )
}