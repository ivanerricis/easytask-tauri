import { LayoutTemplate } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { toast } from "sonner"
import { DialogFormShell } from "./dialog-form-shell"
import { FormFooter } from "@/components/form-footer"
import { NameField } from "@/components/name-field"
import { useFormSubmit } from "@/components/use-form-submit"
import { useWorkspaceActions } from "@/contexts/workspace-data"

type DialogCreateTemplateProps = {
    /** The source note (only id and name are used). */
    note: { id: number, name: string }
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    /** Called after the template was created (e.g. to reload a list of templates). */
    onCreated?: () => void
}

type TemplateFormProps = Pick<DialogCreateTemplateProps, "note" | "onOpenChange" | "onCreated">

// Mounted only while the dialog is open, so the name always starts from the note name
const TemplateForm = ({ note, onOpenChange, onCreated }: TemplateFormProps) => {
    const { t } = useTranslation()
    const { createTemplateFromNote } = useWorkspaceActions()
    const [name, setName] = useState(note.name)
    const { busy, error, setError, submit } = useFormSubmit(async () => {
        if (!name.trim()) return
        await createTemplateFromNote(note.id, name.trim())
        toast.success(t("dialogs.createTemplate.created"))
        onCreated?.()
        onOpenChange(false)
    })

    return (
        <form onSubmit={submit} className="grid gap-3">
            <NameField
                label={t("dialogs.createTemplate.name")}
                value={name}
                autoFocus
                // The prefilled name is selected: typing replaces it
                selectOnFocus
                error={error}
                onChange={value => {
                    setError(null)
                    setName(value)
                }}
            />
            <FormFooter onCancel={() => onOpenChange(false)} disabled={!name.trim() || busy}>
                <LayoutTemplate />
                {t("dialogs.createTemplate.title")}
            </FormFooter>
        </form>
    )
}

/**
 * Creates a template from a note: an exact copy of its current content (groups, sections, tasks and subtasks;
 * deleted items and audio files are not included). Opened from the note menu, or from the Template dialog after choosing the note.
 * @category Dialogs
 */
export const DialogCreateTemplate = ({ note, isOpen, onOpenChange, onCreated }: DialogCreateTemplateProps) => {
    const { t } = useTranslation()
    return (
        <DialogFormShell
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title={t("dialogs.createTemplate.title")}
            description={t("dialogs.createTemplate.description", { name: note.name })}
        >
            <TemplateForm note={note} onOpenChange={onOpenChange} onCreated={onCreated} />
        </DialogFormShell>
    )
}
