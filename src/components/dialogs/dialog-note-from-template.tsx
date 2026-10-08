import { FilePlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspaceActions, useWorkspaceState } from "@/contexts/workspace-data"
import { useTabsActions } from "@/contexts/use-tabs"
import { getFolderDestinations } from "@/pages/workspacePage/components/sidebar/tree-dnd"
import { getErrorMessage } from "@/lib/utils"
import { useSubmitOnce } from "@/hooks/use-submit-once"
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
    const { t } = useTranslation()
    const { workspaceDataTree } = useWorkspaceState()
    const { createNoteFromTemplate } = useWorkspaceActions()
    const { openNote } = useTabsActions()
    const [name, setName] = useState(template.name)
    const [destination, setDestination] = useState(ROOT_VALUE)
    const [error, setError] = useState<string | null>(null)
    const { saving: busy, run } = useSubmitOnce()

    const destinations = workspaceDataTree ? getFolderDestinations(workspaceDataTree) : [{ id: null, name: null, depth: 0 }]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || busy) return
        await run(async () => {
            try {
                const folderID = destination === ROOT_VALUE ? null : Number(destination)
                // The context adds the note to the sidebar tree
                const noteID = await createNoteFromTemplate(template.id, template.workspaceID, folderID, name.trim(), template.color)
                openNote(noteID)
                toast.success(t("dialogs.noteFromTemplate.created"))
                onOpenChange(false)
                onCreated?.(noteID)
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Label htmlFor="note-from-template-name">{t("dialogs.noteFromTemplate.name")}</Label>
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
            <Label htmlFor="note-from-template-destination">{t("dialogs.noteFromTemplate.destination")}</Label>
            <Select
                value={destination}
                onValueChange={value => {
                    setError(null)
                    setDestination(value)
                }}
            >
                <SelectTrigger id="note-from-template-destination" className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {destinations.map(item => (
                        // Subfolders are indented in the list only (the trigger shows the plain name)
                        <SelectItem key={item.id ?? ROOT_VALUE} value={String(item.id ?? ROOT_VALUE)} style={{ paddingLeft: `${0.5 + item.depth * 0.75}rem` }}>
                            {item.id === null ? t("dialogs.noteFromTemplate.root") : item.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter className="mt-4">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={!name.trim() || busy}>
                    <FilePlus />
                    {t("dialogs.noteFromTemplate.submit")}
                </Button>
            </DialogFooter>
        </form>
    )
}

/**
 * Creates a note from a template (name and destination: workspace root or a folder) and opens it.
 * @category Dialogs
 */
export const DialogNoteFromTemplate = ({ template, isOpen, onOpenChange, onCreated }: DialogNoteFromTemplateProps) => {
    const { t } = useTranslation()
    return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent onClick={e => e.stopPropagation()}>
            <DialogHeader>
                <DialogTitle>{t("dialogs.noteFromTemplate.title")}</DialogTitle>
                <DialogDescription>{t("dialogs.noteFromTemplate.description", { name: template.name })}</DialogDescription>
            </DialogHeader>
            <NoteFromTemplateForm template={template} onOpenChange={onOpenChange} onCreated={onCreated} />
        </DialogContent>
    </Dialog>
    )
}
