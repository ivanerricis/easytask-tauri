import type { Note } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { File } from "lucide-react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import React, { useCallback, useState } from "react"

type ItemNoteProps = {
    note: Note
    className?: string
}

export const ItemNote = React.memo(({ note, className }: ItemNoteProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const { setCurrentNotes, setCurrentNote, getNoteData } = useWorkspaceData()

    const hexToRgba = useCallback((alpha: number, hex?: string) => {
        const match = hex?.replace('#', '').match(/.{1,2}/g)
        if (!match) return hex
        const [r, g, b] = match.map(x => parseInt(x, 16))
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }, [])

    const handleOpenFile = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation()
        await getNoteData(note.id)
        setCurrentNotes(prev => prev.some(n => n.id === note.id) ? prev : [...prev, note])
        setCurrentNote(note)
    }, [note, getNoteData, setCurrentNotes, setCurrentNote])

    return (
        <div
            role="button"
            onClick={handleOpenFile}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative group cursor-pointer w-full h-7 flex items-center opacity-85 bg-background hover:opacity-100 rounded-xs border border-accent overflow-x-hidden ${className}`}
            style={{ backgroundColor: `${hexToRgba(isHovered ? 0.8 : 0.5, note.color)}` }}
        >
            {/* Icon + Text */}
            <div className="flex items-center gap-1 px-1 overflow-hidden w-full">
                <File className="size-4 shrink-0 text-foreground" />
                <h1 className="text-sm text-foreground truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]">
                    {note.name}
                </h1>
            </div>
            <div className="shrink-0 px-1 opacity-0 group-hover:opacity-100">
                <ButtonMenuNote note={note} />
            </div>
        </div>

    )
})