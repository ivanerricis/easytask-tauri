import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormFooter } from "@/components/form-footer"
import { NameField } from "@/components/name-field"
import { useFormSubmit } from "@/components/use-form-submit"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { isUndoableType } from "@/contexts/undo/commands"
import { useRef, useState } from "react"
import type { DBItemType } from "@/db/queries/shared_queries"

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
    const inputRef = useRef<HTMLInputElement>(null)
    const { renameItem } = useWorkspaceData()
    const recorder = useUndoRecorder()
    // A group may be unnamed: saving an empty name clears it
    const allowEmpty = itemType === "section_group"

    const { busy: saving, error, setError, submit } = useFormSubmit(async () => {
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
        } catch (err) {
            rollback?.()
            throw err
        }
        onOpenChange(false)
    })

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
                <form onSubmit={submit}>
                    <div className="grid gap-3">
                        <NameField
                            ref={inputRef}
                            label={t("common.name")}
                            hideLabel
                            value={value}
                            readOnly={saving}
                            error={error}
                            onChange={next => {
                                setError(null)
                                setValue(next)
                            }}
                        />
                    </div>
                    <FormFooter onCancel={handleCancel} disabled={(!allowEmpty && !value.trim()) || saving}>
                        <Check />
                        {t("common.save")}
                    </FormFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}