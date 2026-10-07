import { FilePlus } from "lucide-react"
import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
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
import { OptionalColorField } from "@/components/optional-color-field"
import { useTemplates } from "@/hooks/use-templates"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { useSubmitOnce } from "@/hooks/use-submit-once"

type AddNoteDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** The folder the note is created in; null for the workspace root. */
    parentId: number | null
    /** Offers the optional color (root notes only: notes in folders take no color on creation). */
    withColor?: boolean
}

/** Creates a note (blank or from a template) in the workspace root or in a folder. */
export function AddNoteDialog({ open, onOpenChange, parentId, withColor = false }: AddNoteDialogProps) {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [color, setColor] = useState<string | undefined>(undefined)
    const [error, setError] = useState<string | null>(null)
    const [templateId, setTemplateId] = useState("")
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceNote, createNoteInFolder, createNoteFromTemplate } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const { saving, run } = useSubmitOnce()
    const nameId = useId()
    const templateFieldId = useId()
    const templates = useTemplates(open)
    // A stale selection (template deleted meanwhile) behaves as "no template"
    const template = templates.find(tpl => String(tpl.id) === templateId)

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setName("")
            setColor(undefined)
            setError(null)
            setTemplateId("")
        }
        onOpenChange(next)
    }

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        const trimmed = name.trim()
        if (trimmed === "") return
        await run(async () => {
            try {
                // Both are added to the sidebar tree by the context
                const id = template
                    ? await createNoteFromTemplate(template.id, currentWorkspace.id, parentId, trimmed, template.color)
                    : parentId === null
                        ? await createWorkspaceNote(currentWorkspace.id, trimmed, withColor ? color : undefined)
                        : await createNoteInFolder(currentWorkspace.id, parentId, trimmed)
                if (typeof id === "number") recorder.create("note", id, trimmed)
                handleOpenChange(false)
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("dialogs.addNote.title")}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateNote}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor={nameId}>{t("common.name")}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id={nameId}
                                    name="name"
                                    value={name}
                                    onChange={e => {
                                        setError(null)
                                        setName(e.target.value)
                                    }}
                                />
                                {withColor && !template && <OptionalColorField value={color} onChange={setColor} />}
                            </div>
                        </div>
                        {templates.length > 0 && (
                            <div className="grid gap-3">
                                <Label htmlFor={templateFieldId}>{t("dialogs.addNote.fromTemplate")}</Label>
                                <NativeSelect
                                    id={templateFieldId}
                                    value={template ? templateId : ""}
                                    onChange={e => setTemplateId(e.target.value)}
                                >
                                    <option value="">{t("dialogs.addNote.noTemplate")}</option>
                                    {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                                </NativeSelect>
                            </div>
                        )}
                        {error && (<p className="text-xs text-destructive">{error}</p>)}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => handleOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={!name.trim() || saving}>
                            <FilePlus />
                            {t("dialogs.addNote.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
