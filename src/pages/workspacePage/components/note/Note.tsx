import { File } from "lucide-react"
import { ButtonMenuNote } from "./ButtonMenuNote"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import type { Note } from "@/types/types"
import { useState } from "react"
import { DialogAddColor } from "../section/dialogs/DialogAddColor"
import { useWorkspace } from "@/contexts/workspace-context"

type ItemNoteProps = {
    note: Note
    className?: string
}

export const ItemNote = ({ note, className }: ItemNoteProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isColorOpen, setIsColorOpen] = useState(false)
    const { currentWorkspace } = useWorkspace()
    const { setCurrentNotes, setCurrentNote, getNoteData, updateItemColor, getWorkspaceData } = useWorkspaceData()

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
        <div className="relative flex">
            <div
                role="button"
                onClick={handleOpenFile}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`group cursor-pointer w-full h-7 flex items-center opacity-85 bg-background hover:opacity-100 rounded-xs border overflow-x-hidden ${className}`}
                style={{ backgroundColor: `${hexToRgba(isHovered ? 0.8 : 0.5, note.color)}` }}

            >
                {/* Text + Icon */}
                <div className={`flex items-center px-1 gap-2 w-full`}>
                    <File className="w-4 h-4 shrink-0 text-foreground" />
                    <h1 className="text-left text-sm text-foreground w-full truncate pr-6">
                        {note.name}
                    </h1>
                </div>
                <div className="flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ButtonMenuNote
                        note={note}
                        onChangeColor={() => setIsColorOpen(true)}
                    />
                </div>
            </div>

            <DialogAddColor
                item={note}
                itemType="note"
                isOpen={isColorOpen}
                onOpenChange={setIsColorOpen}
                addColorItem={updateItemColor}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
        </div>
    )
}