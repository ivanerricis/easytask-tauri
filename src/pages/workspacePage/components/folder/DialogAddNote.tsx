import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/utils"
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
import { toast } from "sonner"

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
        } catch (err) {
            setError(getErrorMessage(err))
            toast.error(getErrorMessage(err))
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
                <form onSubmit={handleCreateNote} className="grid gap-3">
                    <Input
                        id="name-1"
                        name="name"
                        value={name}
                        onChange={(e) => {
                            setError(null)
                            setName(e.target.value)
                        }}
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
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