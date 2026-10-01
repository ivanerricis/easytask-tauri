import { useTranslation } from "react-i18next"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { getErrorMessage } from "@/lib/utils"

type DialogCreateTemplateProps = {
    /** The source note (only id and name are used). */
    note: { id: number, name: string }
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

type TemplateFormProps = Pick<DialogCreateTemplateProps, "note" | "onOpenChange">

// Mounted only while the dialog is open, so the name always starts from the note name
const TemplateForm = ({ note, onOpenChange }: TemplateFormProps) => {
    const { t } = useTranslation()
    const { createTemplateFromNote } = useWorkspaceActions()
    const [name, setName] = useState(note.name)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || busy) return
        setBusy(true)
        try {
            await createTemplateFromNote(note.id, name.trim())
            toast.success(t("dialogs.createTemplate.created"))
            onOpenChange(false)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-3">
            <Label htmlFor="template-name">{t("dialogs.createTemplate.name")}</Label>
            <Input
                id="template-name"
                name="name"
                value={name}
                autoFocus
                onChange={e => {
                    setError(null)
                    setName(e.target.value)
                }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter className="mt-4">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={!name.trim() || busy}>
                    {t("dialogs.createTemplate.title")}
                </Button>
            </DialogFooter>
        </form>
    )
}

/**
 * Creates a template from a note: an exact copy of its current content (groups, sections, tasks and subtasks;
 * deleted items and audio files are not included). Meant to be opened from the note menu.
 * @category Dialogs
 */
export const DialogCreateTemplate = ({ note, isOpen, onOpenChange }: DialogCreateTemplateProps) => {
    const { t } = useTranslation()
    return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent onClick={e => e.stopPropagation()}>
            <DialogHeader>
                <DialogTitle>{t("dialogs.createTemplate.title")}</DialogTitle>
                <DialogDescription>
                    {t("dialogs.createTemplate.description", { name: note.name })}
                </DialogDescription>
            </DialogHeader>
            <TemplateForm note={note} onOpenChange={onOpenChange} />
        </DialogContent>
    </Dialog>
    )
}
