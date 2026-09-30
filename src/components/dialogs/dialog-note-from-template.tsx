import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import { useWorkspaceActions, useWorkspaceState } from "@/contexts/workspace-data-context"
import { useTabsActions } from "@/contexts/tabs-context"
import { getFolderDestinations } from "@/pages/workspacePage/components/sidebar/tree-dnd"
import { getErrorMessage } from "@/lib/utils"
import type { NoteTemplate } from "@/types/template"

type DialogNoteFromTemplateProps = {
    template: NoteTemplate
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    /** Called with the id of the new note once it is created and opened. */
    onCreated?: (noteId: number) => void
}

const ROOT_VALUE = "root"

type FormProps = Omit<DialogNoteFromTemplateProps, "isOpen">

// Mounted only while the dialog is open, so the fields always start from their defaults
const NoteFromTemplateForm = ({ template, onOpenChange, onCreated }: FormProps) => {
    const { workspaceDataTree } = useWorkspaceState()
    const { createNoteFromTemplate } = useWorkspaceActions()
    const { openNote } = useTabsActions()
    const [name, setName] = useState(template.name)
    const [destination, setDestination] = useState(ROOT_VALUE)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const destinations = workspaceDataTree ? getFolderDestinations(workspaceDataTree) : [{ id: null, name: null, depth: 0 }]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || busy) return
        setBusy(true)
        try {
            const folderID = destination === ROOT_VALUE ? null : Number(destination)
            // The context adds the note to the sidebar tree
            const noteID = await createNoteFromTemplate(template.id, template.workspaceID, folderID, name.trim(), template.color)
            openNote(noteID)
            toast.success("Nota creata")
            onOpenChange(false)
            onCreated?.(noteID)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Label htmlFor="note-from-template-name">Nome</Label>
            <Input
                id="note-from-template-name"
                name="name"
                value={name}
                autoFocus
                onChange={e => {
                    setError(null)
                    setName(e.target.value)
                }}
            />
            <Label htmlFor="note-from-template-destination">Destinazione</Label>
            <NativeSelect
                id="note-from-template-destination"
                value={destination}
                onChange={e => {
                    setError(null)
                    setDestination(e.target.value)
                }}
            >
                {destinations.map(item => (
                    <option key={item.id ?? ROOT_VALUE} value={item.id ?? ROOT_VALUE}>
                        {item.id === null ? "Radice del workspace" : `${"  ".repeat(item.depth)}${item.name}`}
                    </option>
                ))}
            </NativeSelect>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter className="mt-4">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                    Annulla
                </Button>
                <Button type="submit" disabled={!name.trim() || busy}>
                    Crea nota
                </Button>
            </DialogFooter>
        </form>
    )
}

/**
 * Creates a note from a template (name and destination: workspace root or a folder) and opens it.
 * @category Dialogs
 */
export const DialogNoteFromTemplate = ({ template, isOpen, onOpenChange, onCreated }: DialogNoteFromTemplateProps) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent onClick={e => e.stopPropagation()}>
            <DialogHeader>
                <DialogTitle>Crea nota da template</DialogTitle>
                <DialogDescription>Template: {template.name}</DialogDescription>
            </DialogHeader>
            <NoteFromTemplateForm template={template} onOpenChange={onOpenChange} onCreated={onCreated} />
        </DialogContent>
    </Dialog>
)
