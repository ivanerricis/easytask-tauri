import { X } from "lucide-react"
import React, { useEffect, useState } from "react"
import { toast } from "sonner"

type DialogAddColorProps<T> = {
    item: T
    itemType: string
    isOpen: boolean
    getItemId?: number | undefined
    onOpenChange: (open: boolean) => void
    addColorItem: (itemType: string, id: number, color?: string) => Promise<void>
    getItemData: (id: number) => Promise<void>
    className?: string
}

type defaultItemType = {
    id: number
    color?: string | null | undefined
}

const COLORS16 = [
    '#e6194b', // rosso vivo
    '#3cb44b', // verde intenso
    '#ffe119', // giallo brillante
    '#4363d8', // blu forte
    '#f58231', // arancio acceso
    '#911eb4', // viola profondo
    '#46f0f0', // ciano chiaro
    '#f032e6', // rosa magenta
    '#bcf60c', // lime chiaro
    '#fabebe', // rosa pesca
    '#008080', // teal scuro
    '#e6beff', // lilla delicato
    '#9a6324', // marrone scuro
    '#fffac8', // crema chiaro
    '#000075', // blu notte
    '#808080', // grigio neutro
] as const

export const DialogAddColor = <T extends defaultItemType>({ item, itemType, isOpen, getItemId, onOpenChange, addColorItem, getItemData, className }: DialogAddColorProps<T>) => {
    const [color, setColor] = useState(item.color)
    const dialogRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onOpenChange(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onOpenChange]);

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
        onOpenChange(false)
        try {
            const colorToSave = selectedColor ?? color
            if (item.color !== colorToSave && getItemId && colorToSave) {
                await addColorItem(itemType, item.id, colorToSave)
                await getItemData(getItemId)
            }
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const handleDeleteColor = async (e: React.MouseEvent) => {
        e.stopPropagation()
        onOpenChange(false)
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
        <>
            {isOpen && <div
                ref={dialogRef}
                className={`flex flex-col z-[99999] rounded-xs gap-1, ${className}`}
            >
                <div className="bg-background border">
                    <div className="grid grid-cols-4">
                        {COLORS16.map((colorValue) => (
                            <div
                                role="button"
                                key={colorValue}
                                onClick={(e) => {
                                    handleColorClick(colorValue, e);
                                }}
                                className="cursor-pointer h-6 w-6"
                                style={{ backgroundColor: colorValue }}
                            >
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-start p-1">
                        <button
                            onClick={handleDeleteColor}
                            className="flex items-center p-1 cursor-pointer w-full hover:bg-secondary rounded-xs text-sm"
                        >
                            <X className="h-5 w-5" />
                            Elimina
                        </button>
                    </div>
                </div>
            </div>}
        </>
    )
}