import { useTranslation } from "react-i18next"
import { Plus, X } from "lucide-react"
import React, { useState } from "react"
import { reportError } from "@/lib/report-error"
import type { DBItemType } from "@/db/queries/shared_queries"
import { getErrorMessage } from "@/lib/utils"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getItemName, isUndoableType } from "@/contexts/undo/commands"

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

const COLORS = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
    '#f58231', '#911eb4', '#46f0f0', '#f032e6',
    '#bcf60c', '#fabebe', '#008080', '#e6beff',
    '#9a6324', '#fffac8', '#000075',
] as const

export const DialogAddColor = <T extends defaultItemType>({ item, itemType, getItemId, addColorItem, onPick, getItemData, setDropDownOpen, className }: DialogAddColorProps<T>) => {
    const { t } = useTranslation()
    const recorder = useUndoRecorder()
    const [color, setColor] = useState(item?.color)
    const dialogRef = React.useRef<HTMLDivElement>(null);
    const [inputColor, setInputColor] = useState("#000000")
    // Reloading needs the id; without a reload hook the change is saved as is
    const canSave = !getItemData || !!getItemId

    const handleColorClick = async (colorValue: string, e: React.MouseEvent) => {
        setColor(colorValue)
        await handleSaveColor(e, colorValue)
    }

    const handleSaveColor = async (e: React.MouseEvent, selectedColor?: string) => {
        e.stopPropagation()
        if (setDropDownOpen) setDropDownOpen(false)
        try {
            const colorToSave = selectedColor ?? color
            if (onPick) {
                if (colorToSave) await onPick(colorToSave)
            } else if (item && itemType && addColorItem && item.color !== colorToSave && colorToSave && canSave) {
                await addColorItem(itemType, item.id, colorToSave)
                if (getItemData && getItemId) await getItemData(getItemId)
                if (isUndoableType(itemType)) recorder.color(itemType, item.id, getItemName(item), item.color ?? null, colorToSave)
            }
        } catch (err) {
            reportError(err, getErrorMessage(err))
        } finally {
            setInputColor("#000000")
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
        <div
            ref={dialogRef}
            className={`flex flex-col rounded-xs ${className}`}
        >
            <div className="grid grid-cols-4">
                {COLORS.map((colorValue) => (
                    <button
                        type="button"
                        aria-label={t("dialogs.color.swatch", { color: colorValue })}
                        key={colorValue}
                        onClick={(e) => {
                            handleColorClick(colorValue, e);
                        }}
                        className="cursor-pointer size-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        style={{ backgroundColor: colorValue }}
                    >
                    </button>
                ))}
                <div
                    className="relative flex items-center justify-center size-6"
                    style={{ backgroundColor: inputColor }}
                >
                    <input
                        type="color"
                        className="opacity-0 cursor-pointer"
                        value={inputColor}
                        onChange={(e) => {
                            const newColor = e.target.value
                            setInputColor(newColor)
                            handleColorClick(newColor, e as unknown as React.MouseEvent)
                        }}
                    />
                    <Plus className="absolute pointer-events-none size-5 text-background dark:text-foreground" />
                </div>
            </div>
            <div className="flex items-center p-1">
                <button
                    onClick={handleDeleteColor}
                    className="flex items-center p-1 cursor-pointer w-full hover:bg-secondary rounded-xs text-xs"
                >
                    <X className="size-4" />
                    {t("common.delete")}
                </button>
            </div>
        </div>
    )
}
