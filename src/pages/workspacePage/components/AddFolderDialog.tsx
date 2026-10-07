import { FolderPlus } from "lucide-react"
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
import { OptionalColorField } from "@/components/optional-color-field"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { useSubmitOnce } from "@/hooks/use-submit-once"

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
    const [error, setError] = useState<string | null>(null)
    const { currentWorkspace } = useWorkspace()
    const { createWorkspaceFolder, createSubFolder } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const { saving, run } = useSubmitOnce()
    const nameId = useId()

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setName("")
            setColor(undefined)
            setError(null)
        }
        onOpenChange(next)
    }

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        const trimmed = name.trim()
        if (trimmed === "") return
        await run(async () => {
            try {
                const id = parentId === null
                    ? await createWorkspaceFolder(currentWorkspace.id, trimmed, withColor ? color : undefined)
                    : await createSubFolder(currentWorkspace.id, parentId, trimmed)
                if (typeof id === "number") recorder.create("folder", id, trimmed)
                handleOpenChange(false)
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogs.addFolder.title")}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateFolder}>
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
                                {withColor && <OptionalColorField value={color} onChange={setColor} />}
                            </div>
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => handleOpenChange(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || saving}
                        >
                            <FolderPlus />
                            {t("dialogs.addFolder.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
