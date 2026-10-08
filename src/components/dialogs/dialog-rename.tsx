import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormError } from "@/components/form-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { isUndoableType } from "@/contexts/undo/commands"
import React, { useId, useRef, useState } from "react"
import type { DBItemType } from "@/db/queries/shared_queries"
import { getErrorMessage } from "@/lib/utils"
import { useSubmitOnce } from "@/hooks/use-submit-once"

type DialogRenameProps<T> = {
    item: T
    itemType: DBItemType
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    getItemId?: number | undefined
    /** Reloads the data after the rename (when the change is not applied optimistically). */
    getItemData?: (id: number) => Promise<void>
    /** Applies the new name to the cached data before the write; returns the function that undoes it if the write fails. */
    optimistic?: (name: string) => () => void
}

type defaultItemType = {
    id: number
    name?: string | null
    title?: string
}

export const DialogRenameItem = <T extends defaultItemType>({ item, itemType, isOpen, onOpenChange, getItemData, getItemId, optimistic }: DialogRenameProps<T>) => {
    const { t } = useTranslation()
    const currentName = item.name ?? item.title ?? ""
    const [value, setValue] = useState(currentName)
    const nameId = useId()
    const errorId = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const { saving, run } = useSubmitOnce()
    const { renameItem } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const [error, setError] = useState<string | null>(null)
    // A group may be unnamed: saving an empty name clears it
    const allowEmpty = itemType === "section_group"

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        await run(async () => {
            let rollback: (() => void) | undefined
            try {
                if ((allowEmpty || value.trim()) && value.trim() !== currentName) {
                    rollback = optimistic?.(value.trim())
                    await renameItem(itemType, item.id, value.trim())
                    if (isUndoableType(itemType)) recorder.rename(itemType, item.id, currentName, value.trim())
                }
                if (typeof getItemId === "number") {
                    await getItemData?.(getItemId)
                }
                setError(null)
                onOpenChange(false)
            } catch (err) {
                rollback?.()
                setError(getErrorMessage(err))
            }
        })
    }

    // Every way of closing (Cancel, Escape, click outside) drops the typed value and the error
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setValue(currentName)
            setError(null)
        }
        onOpenChange(open)
    }

    const handleCancel = () => handleOpenChange(false)

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-md"
                aria-describedby={undefined}
                // The current name is selected: typing replaces it
                onOpenAutoFocus={e => {
                    e.preventDefault()
                    inputRef.current?.focus()
                    inputRef.current?.select()
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t("common.rename")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEdit}>
                    <div className="grid gap-3">
                        <Label htmlFor={nameId} className="sr-only">{t("common.name")}</Label>
                        <Input
                            id={nameId}
                            ref={inputRef}
                            name="name"
                            value={value}
                            readOnly={saving}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? errorId : undefined}
                            onChange={e => {
                                setError(null)
                                setValue(e.target.value)
                            }}
                        />
                        <FormError id={errorId}>{error}</FormError>
                    </div>
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
                            disabled={(!allowEmpty && !value.trim()) || saving}
                        >
                            <Check />
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}