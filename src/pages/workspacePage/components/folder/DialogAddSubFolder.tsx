import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/utils"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspace } from "@/contexts/use-workspace"
import type { Folder } from "@/types/types"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import React, { useId, useState } from "react"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { toast } from "sonner"

type ParentFolderProps = {
    parentFolder: Folder
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DialogAddSubFolder({ parentFolder, isOpen, onOpenChange }: ParentFolderProps) {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const { createSubFolder } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const { currentWorkspace } = useWorkspace()
    const { saving, run } = useSubmitOnce()
    const nameId = useId()

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentWorkspace?.id) return
        if (name.trim() === "") return
        await run(async () => {
            try {
                const id = await createSubFolder(currentWorkspace.id, parentFolder.id, name.trim())
                if (typeof id === "number") recorder.create("folder", id, name.trim())
                setError(null)
                onOpenChange(false)
                setName("")
            } catch (err) {
                setError(getErrorMessage(err))
                toast.error(getErrorMessage(err))
            }
        })
    }

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation()
        setName("")
        setError(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => { e.stopPropagation() }}>
                <DialogHeader>
                    <DialogTitle>{t("dialogs.addFolder.title")}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <form onSubmit={handleCreateFolder} className="grid gap-3">
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
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={handleCancel}
                            >
                                {t("common.cancel")}
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={!name.trim() || saving}>
                            {t("dialogs.addFolder.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}