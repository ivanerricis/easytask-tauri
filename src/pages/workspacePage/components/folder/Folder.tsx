import { ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react"
import React, { useCallback, useState } from "react"
import { ButtonMenuFolder } from "./ButtonMenuFolder"
import type { Folder } from "@/types/types"

type ItemFolderProps = {
    folder: Folder
    className?: string
    children?: React.ReactNode
}

export const ItemFolder = React.memo(({ folder, className, children }: ItemFolderProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const [height, setHeight] = useState(true)

    const hasContent = React.Children.count(children) > 0

    const hexToRgba = useCallback((alpha: number, hex?: string) => {
        const match = hex?.replace('#', '').match(/.{1,2}/g)
        if (!match) return hex
        const [r, g, b] = match.map(x => parseInt(x, 16))
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }, [])

    return (
        <div className="relative flex flex-col gap-1 w-full">
            <div
                role="button"
                onClick={() => setHeight(!height)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group cursor-pointer gap-1 w-full pl-1 h-7 flex items-center rounded-xs border border-accent bg-background opacity-85 hover:opacity-100 overflow-x-hidden"
                style={{ backgroundColor: `${hexToRgba(isHovered ? 0.8 : 0.5, folder.color)}` }}
            >
                <div className={`relative w-full h-full flex items-center gap-1 ${className}`}>
                    <ChevronDown className={`${height ? 'rotate-0' : '-rotate-90'} size-4 shrink-0 opacity-85 group-hover:opacity-100 transition-all`} />
                    {height ? (
                        <FolderOpen className="size-4 shrink-0" />
                    ) : (
                        <FolderIcon className="size-4 shrink-0" />
                    )}
                    <h1 className="w-full text-sm truncate whitespace-nowrap overflow-hidden max-w-[calc(100%-1rem)]">
                        {folder.name}
                    </h1>
                    <div className="shrink-0 px-1 opacity-0 group-hover:opacity-100">
                        <ButtonMenuFolder folder={folder} />
                    </div>
                </div>
            </div>

            {height && hasContent && (
                <div className="relative w-full">
                    <div className="absolute left-[9px] h-full w-[1px] bg-foreground/15" />
                    <div className="ml-[17px] flex flex-col gap-1">
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
})