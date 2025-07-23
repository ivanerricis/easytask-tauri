import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/contexts/workspace-context"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import React, { useState } from "react"

type ParentFolderProps = {
    parentFolder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DialogAddNote({ parentFolder, isOpen, onOpenChange }: ParentFolderProps) {
    const [name, setName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const { createNoteInFolder, getWorkspaceData } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return
        if (name.trim() === "") return
        try {
            await createNoteInFolder(parentFolder.id, name.trim())
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            onOpenChange(false)
            setName("")
        } catch (err: any) {
            setError(err.message)
            console.log(error)
        }
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setName("")
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent onClick={(e) => { e.stopPropagation() }}>
                <DialogHeader>
                    <DialogTitle>Crea una nota</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateNote}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Input
                                id="name-1"
                                name="name"
                                value={name}
                                onChange={(e) => {
                                    setError(null)
                                    setName(e.target.value )
                                }}
                                onClick={(e) => { e.stopPropagation() }}
                            />
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={handleCancel}
                        >
                            Annulla
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim()}
                        >
                            Crea nota
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}