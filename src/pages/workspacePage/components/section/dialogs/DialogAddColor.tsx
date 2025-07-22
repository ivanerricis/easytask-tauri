import { Plus, X } from "lucide-react"
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

export const DialogAddColor = <T extends defaultItemType>({ item, itemType, isOpen, getItemId, onOpenChange, addColorItem, getItemData, className }: DialogAddColorProps<T>) => {
    const [color, setColor] = useState("#FFFFFF")
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

    const handleSaveColor = async (e: React.MouseEvent) => {
        e.stopPropagation()
        onOpenChange(false)
        try {
            if (item.color !== color && getItemId) {
                await addColorItem(itemType, item.id, color)
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
                className={`absolute flex flex-col right-0 -top-5 bg-background z-[99999] shadow-xs border rounded-xs, ${className}`}
            >
                <div className="relative h-10" style={{ backgroundColor: color }}>
                    <input
                        type="color"
                        className="opacity-0 w-full h-full"
                        onChange={(e) => setColor(e.target.value)}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
                <div className="flex divide-x-1">
                    <button
                        onClick={handleSaveColor}
                        className="flex items-center justify-center p-1 cursor-pointer"
                    >
                        <Plus />
                    </button>
                    <button
                        onClick={handleDeleteColor}
                        className="flex items-center justify-center p-1 cursor-pointer"
                    >
                        <X />
                    </button>
                </div>
            </div>}
        </>
    )
}