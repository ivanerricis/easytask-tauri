import { Plus, X } from "lucide-react"
import React, { useEffect, useState } from "react"
import { toast } from "sonner"

type DialogAddColorProps<T> = {
    item: T
    itemType: string
    getItemId?: number | undefined
    addColorItem: (itemType: string, id: number, color?: string) => Promise<void>
    getItemData: (id: number) => Promise<void>
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

export const DialogAddColor = <T extends defaultItemType>({ item, itemType, getItemId, addColorItem, getItemData, setDropDownOpen, className }: DialogAddColorProps<T>) => {
    const [color, setColor] = useState(item.color)
    const dialogRef = React.useRef<HTMLDivElement>(null);
    const [inputColor, setInputColor] = useState("#000000")

    useEffect(() => {
        if (item.color)
            setColor(item.color)
    }, [])

    const handleColorClick = async (colorValue: string, e: React.MouseEvent) => {
        setColor(colorValue)
        await handleSaveColor(e, colorValue)
    }

    const handleSaveColor = async (e: React.MouseEvent, selectedColor?: string) => {
        e.stopPropagation()
        if (setDropDownOpen) setDropDownOpen(false)
        try {
            const colorToSave = selectedColor ?? color
            if (item.color !== colorToSave && getItemId && colorToSave) {
                await addColorItem(itemType, item.id, colorToSave)
                await getItemData(getItemId)
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setInputColor("#000000")
        }
    }

    const handleDeleteColor = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (setDropDownOpen) setDropDownOpen(false)
        try {
            if (item.color && getItemId) {
                await addColorItem(itemType, item.id)
                await getItemData(getItemId)
            }
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    return (
        <div
            ref={dialogRef}
            className={`flex flex-col rounded-xs, ${className}`}
        >
            <div className="grid grid-cols-4">
                {COLORS.map((colorValue) => (
                    <div
                        role="button"
                        key={colorValue}
                        onClick={(e) => {
                            handleColorClick(colorValue, e);
                        }}
                        className="cursor-pointer size-6"
                        style={{ backgroundColor: colorValue }}
                    >
                    </div>
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
                    Elimina
                </button>
            </div>
        </div>
    )
}