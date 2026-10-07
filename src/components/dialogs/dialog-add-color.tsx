import { useTranslation } from "react-i18next"
import { X } from "lucide-react"
import React from "react"
import { reportError } from "@/lib/report-error"
import type { DBItemType } from "@/db/queries/shared_queries"
import { getErrorMessage } from "@/lib/utils"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getItemName, isUndoableType } from "@/contexts/undo/commands"
import { ColorPalette } from "@/components/color-palette"

export type DialogAddColorProps<T> = {
    /** The item to color; not needed with `onPick`. */
    item?: T
    itemType?: DBItemType
    getItemId?: number | undefined
    addColorItem?: (itemType: DBItemType, id: number, color?: string) => Promise<void>
    /** Takes over the change (e.g. a color for several items): called with the chosen color, null to remove it. Nothing is saved or recorded here. */
    onPick?: (color: string | null) => void | Promise<void>
    /** Reloads the data after the change; not needed when `addColorItem` updates the cached data itself. */
    getItemData?: (id: number) => Promise<void>
    setDropDownOpen?: (open: boolean) => void
    className?: string
}

type defaultItemType = {
    id: number
    color?: string | null | undefined
}

export const DialogAddColor = <T extends defaultItemType>({ item, itemType, getItemId, addColorItem, onPick, getItemData, setDropDownOpen, className }: DialogAddColorProps<T>) => {
    const { t } = useTranslation()
    const recorder = useUndoRecorder()
    // Reloading needs the id; without a reload hook the change is saved as is
    const canSave = !getItemData || !!getItemId

    const handleSaveColor = async (colorToSave: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (setDropDownOpen) setDropDownOpen(false)
        try {
            if (onPick) {
                await onPick(colorToSave)
            } else if (item && itemType && addColorItem && item.color !== colorToSave && canSave) {
                await addColorItem(itemType, item.id, colorToSave)
                if (getItemData && getItemId) await getItemData(getItemId)
                if (isUndoableType(itemType)) recorder.color(itemType, item.id, getItemName(item), item.color ?? null, colorToSave)
            }
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
    }

    const handleDeleteColor = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (setDropDownOpen) setDropDownOpen(false)
        try {
            if (onPick) {
                await onPick(null)
            } else if (item && itemType && addColorItem && item.color && canSave) {
                await addColorItem(itemType, item.id)
                if (getItemData && getItemId) await getItemData(getItemId)
                if (isUndoableType(itemType)) recorder.color(itemType, item.id, getItemName(item), item.color ?? null, null)
            }
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
    }

    return (
        <div className={`flex flex-col rounded-xs ${className}`}>
            <ColorPalette value={item?.color} onPick={handleSaveColor} />
            <div className="flex items-center p-1">
                <button
                    type="button"
                    onClick={handleDeleteColor}
                    className="flex items-center gap-2 px-1 py-1.5 cursor-pointer w-full rounded-xs text-xs text-destructive hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <X className="size-4" />
                    {t("common.delete")}
                </button>
            </div>
        </div>
    )
}
