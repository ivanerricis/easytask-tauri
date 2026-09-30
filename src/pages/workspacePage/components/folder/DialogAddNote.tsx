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
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import { useTemplates } from "@/hooks/use-templates"
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
    const [templateId, setTemplateId] = useState("")
    const { createNoteInFolder, createNoteFromTemplate, getWorkspaceData } = useWorkspaceData()
    const templates = useTemplates(isOpen)
    // A stale selection (template deleted meanwhile) behaves as "no template"
    const template = templates.find(t => String(t.id) === templateId)
    const { currentWorkspace } = useWorkspace()

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return
        if (name.trim() === "") return
        try {
            if (template)
                await createNoteFromTemplate(template.id, currentWorkspace.id, parentFolder.id, name.trim())
            else
                await createNoteInFolder(currentWorkspace.id, parentFolder.id, name.trim())
            await getWorkspaceData(currentWorkspace.id)
            setError(null)
            onOpenChange(false)
            setName("")
            setTemplateId("")
        } catch (err) {
            setError(getErrorMessage(err))
            toast.error(getErrorMessage(err))
        }
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setName("")
        setError(null)
        setTemplateId("")
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
                    {templates.length > 0 && (
                        <>
                            <Label htmlFor="template-1">Da template</Label>
                            <NativeSelect
                                id="template-1"
                                value={template ? templateId : ""}
                                onChange={e => setTemplateId(e.target.value)}
                            >
                                <option value="">Nessun template</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </NativeSelect>
                        </>
                    )}
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