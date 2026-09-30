import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/utils"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/contexts/use-workspace"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data"
import React, { useState } from "react"
import { toast } from "sonner"

type ParentFolderProps = {
    parentFolder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DialogAddSubFolder({ parentFolder, isOpen, onOpenChange }: ParentFolderProps) {
    const [name, setName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const { createSubFolder } = useWorkspaceData()
    const { currentWorkspace } = useWorkspace()

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (name.trim() === "") return
        try {
            await createSubFolder(currentWorkspace.id, parentFolder.id, name.trim())
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
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => { e.stopPropagation() }}>
                <DialogHeader>
                    <DialogTitle>Crea una cartella</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateFolder} className="grid gap-3">
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
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={handleCancel}
                            >
                                Annulla
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={!name.trim()}>
                            Crea cartella
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}