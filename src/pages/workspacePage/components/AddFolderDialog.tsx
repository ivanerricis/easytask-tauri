import { FolderPlus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { FormFooter } from "@/components/form-footer"
import { NameField } from "@/components/name-field"
import { useFormSubmit } from "@/components/use-form-submit"
import { OptionalColorField } from "@/components/optional-color-field"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"

type AddFolderDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** The folder the new folder is created in; null for the workspace root. */
    parentId: number | null
    /** Offers the optional color (root folders only: subfolders take no color on creation). */
    withColor?: boolean
}

/** Creates a folder in the workspace root or inside another folder. */
export function AddFolderDialog({ open, onOpenChange, parentId, withColor = false }: AddFolderDialogProps) {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [color, setColor] = useState<string | undefined>(undefined)
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceFolder, createSubFolder } = useWorkspaceActions()
    const recorder = useUndoRecorder()

    const reset = () => {
        setName("")
        setColor(undefined)
    }

    const { busy: saving, error, setError, submit } = useFormSubmit(async () => {
        if (!currentWorkspace?.id) return
        const trimmed = name.trim()
        if (trimmed === "") return
        const id = parentId === null
            ? await createWorkspaceFolder(currentWorkspace.id, trimmed, withColor ? color : undefined)
            : await createSubFolder(currentWorkspace.id, parentId, trimmed)
        if (typeof id === "number") recorder.create("folder", id, trimmed)
        reset()
        onOpenChange(false)
    })

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            reset()
            setError(null)
        }
        onOpenChange(next)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("dialogs.addFolder.title")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit}>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <NameField
                                label={t("common.name")}
                                value={name}
                                error={error}
                                onChange={value => {
                                    setError(null)
                                    setName(value)
                                }}
                            >
                                {withColor && <OptionalColorField value={color} onChange={setColor} />}
                            </NameField>
                        </div>
                    </div>
                    <FormFooter onCancel={() => handleOpenChange(false)} disabled={!name.trim() || saving}>
                        <FolderPlus />
                        {t("dialogs.addFolder.submit")}
                    </FormFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
