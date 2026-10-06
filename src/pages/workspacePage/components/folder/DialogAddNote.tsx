import { FilePlus } from "lucide-react"
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
import { useTemplates } from "@/hooks/use-templates"
import { useWorkspace } from "@/contexts/use-workspace"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import React, { useId, useState } from "react"
import { useSubmitOnce } from "@/hooks/use-submit-once"

type ParentFolderProps = {
    parentFolder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DialogAddNote({ parentFolder, isOpen, onOpenChange }: ParentFolderProps) {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [templateId, setTemplateId] = useState("")
    const { createNoteInFolder, createNoteFromTemplate } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const templates = useTemplates(isOpen)
    // A stale selection (template deleted meanwhile) behaves as "no template"
    const template = templates.find(tpl => String(tpl.id) === templateId)
    const { currentWorkspace } = useWorkspace()
    const { saving, run } = useSubmitOnce()
    const nameId = useId()
    const templateFieldId = useId()

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace) return
        if (name.trim() === "") return
        await run(async () => {
            try {
                // Both are added to the sidebar tree by the context
                const id = template
                    ? await createNoteFromTemplate(template.id, currentWorkspace.id, parentFolder.id, name.trim(), template.color)
                    : await createNoteInFolder(currentWorkspace.id, parentFolder.id, name.trim())
                if (typeof id === "number") recorder.create("note", id, name.trim())
                setError(null)
                onOpenChange(false)
                setName("")
                setTemplateId("")
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
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
                    <DialogTitle>{t("dialogs.addNote.title")}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateNote} className="grid gap-3">
                    <Label htmlFor={nameId} className="sr-only">{t("common.name")}</Label>
                    <Input
                        id={nameId}
                        name="name"
                        value={name}
                        onChange={(e) => {
                            setError(null)
                            setName(e.target.value)
                        }}
                    />
                    {templates.length > 0 && (
                        <>
                            <Label htmlFor={templateFieldId}>{t("dialogs.addNote.fromTemplate")}</Label>
                            <NativeSelect
                                id={templateFieldId}
                                value={template ? templateId : ""}
                                onChange={e => setTemplateId(e.target.value)}
                            >
                                <option value="">{t("dialogs.addNote.noTemplate")}</option>
                                {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
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
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || saving}
                        >
                            <FilePlus />
                            {t("dialogs.addNote.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}