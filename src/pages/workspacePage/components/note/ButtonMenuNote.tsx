import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EllipsisVertical } from "lucide-react"
import React, { useState } from "react"
import type { Note } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { useWorkspace } from "@/contexts/workspace-context"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { Separator } from "@/components/ui/separator"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"

type ButtonMenuNoteProps = {
    note: Note
}

export const ButtonMenuNote = ({ note }: ButtonMenuNoteProps) => {
    const { currentWorkspace } = useWorkspace()
    const { setCurrentNotes, setCurrentNote, getNoteData, getWorkspaceData, updateItemColor } = useWorkspaceData()
    const [isColorOpen, setColorOpen] = useState(false);
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
    }

    const openNote = async () => {
        await getNoteData(note.id)
        setCurrentNotes((prev: Note[]) => {
            const alreadyExists = prev.some(n => n.id === note.id)
            return alreadyExists ? prev : [...prev, note]
        })
        setCurrentNote(note)
    }

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <div onClick={handleClick} className="p-1 rounded-xs cursor-pointer">
                        <EllipsisVertical className="!h-4 !w-4" />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    onClick={(e) => { e.stopPropagation() }}
                    className="relative flex w-auto p-0 rounded-xs gap-1 bg-transparent border-none"
                >
                    <div className="flex flex-col gap-1 p-1 border bg-background">
                        <ButtonInPopover
                            text="Apri nota"
                            type="open"
                            onClick={() => { openNote(); setPopoverOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Rinomina"
                            type="rename"
                            onClick={() => { setRenameOpen(true); setPopoverOpen(false) }}
                        />
                        <ButtonInPopover
                            text="Cambia colore"
                            type="color"
                            onClick={() => { setColorOpen(!isColorOpen) }}
                        />
                        <Separator />
                        <ButtonInPopover
                            text="Elimina"
                            type="delete"
                            destructive
                            onClick={() => { setDeleteOpen(true); setPopoverOpen(false) }}
                        />
                    </div>
                    <DialogAddColor
                        item={note}
                        itemType="note"
                        isOpen={isColorOpen}
                        onOpenChange={setColorOpen}
                        addColorItem={updateItemColor}
                        getItemId={currentWorkspace?.id}
                        getItemData={getWorkspaceData}
                    />
                </PopoverContent>
            </Popover>

            <DialogRenameItem
                item={note}
                itemType="note"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
            <DialogDeleteItem
                item={note}
                itemType="note"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
        </>
    )
}