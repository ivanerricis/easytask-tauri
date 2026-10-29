import { FilePlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useId, useState } from "react"
import { toast } from "sonner"
import { DialogFormShell } from "./dialog-form-shell"
import { FormError } from "@/components/form-error"
import { FormFooter } from "@/components/form-footer"
import { Label } from "@/components/ui/label"
import { NameField } from "@/components/name-field"
import { useFormSubmit } from "@/components/use-form-submit"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspaceActions, useWorkspaceState } from "@/contexts/workspace-data"
import { useTabsActions } from "@/contexts/use-tabs"
import { getFolderDestinations } from "@/pages/workspacePage/components/sidebar/tree-dnd"
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
    const errorId = useId()
    const destinationId = useId()

    const destinations = workspaceDataTree ? getFolderDestinations(workspaceDataTree) : [{ id: null, name: null, depth: 0 }]

    const { busy, error, setError, submit } = useFormSubmit(async () => {
        if (!name.trim()) return
        const folderID = destination === ROOT_VALUE ? null : Number(destination)
        // The context adds the note to the sidebar tree
        const noteID = await createNoteFromTemplate(template.id, template.workspaceID, folderID, name.trim(), template.color)
        openNote(noteID)
        toast.success(t("dialogs.noteFromTemplate.created"))
        onOpenChange(false)
        onCreated?.(noteID)
    })

    return (
        <form onSubmit={submit} className="grid gap-3">
            <NameField
                label={t("dialogs.noteFromTemplate.name")}
                value={name}
                autoFocus
                // The prefilled name is selected: typing replaces it
                selectOnFocus
                error={error}
                errorId={errorId}
                showError={false}
                onChange={value => {
                    setError(null)
                    setName(value)
                }}
            />
            <Label htmlFor={destinationId}>{t("dialogs.noteFromTemplate.destination")}</Label>
            <Select
                value={destination}
                onValueChange={value => {
                    setError(null)
                    setDestination(value)
                }}
            >
                <SelectTrigger id={destinationId} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {destinations.map(item => (
                        // Subfolders are indented in the list only (the trigger shows the plain name)
                        <SelectItem key={item.id ?? ROOT_VALUE} value={String(item.id ?? ROOT_VALUE)} style={{ paddingLeft: `${0.5 + item.depth * 0.75}rem` }}>
                            {item.id === null ? t("common.workspaceRoot") : item.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <FormError id={errorId}>{error}</FormError>
            <FormFooter onCancel={() => onOpenChange(false)} disabled={!name.trim() || busy}>
                <FilePlus />
                {t("dialogs.noteFromTemplate.submit")}
            </FormFooter>
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
        <DialogFormShell
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title={t("dialogs.noteFromTemplate.title")}
            description={t("dialogs.noteFromTemplate.description", { name: template.name })}
        >
            <NoteFromTemplateForm template={template} onOpenChange={onOpenChange} onCreated={onCreated} />
        </DialogFormShell>
    )
}
