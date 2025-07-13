import { ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react"
import React, { useState } from "react"
import { ButtonMenuFolder } from "./buttons/ButtonMenuFolder"
import type { Folder } from "@/types"

type ItemFolderProps = {
    folder: Folder
    className?: string
    children?: React.ReactNode
}

export const ItemFolder = ({ folder, className, children }: ItemFolderProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const [height, setHeight] = useState(true)

    const hasContent = React.Children.count(children) > 0

    function hexToRgba(alpha: number, hex?: string) {
        const match = hex?.replace('#', '').match(/.{1,2}/g)
        if (!match) return hex
        const [r, g, b] = match.map(x => parseInt(x, 16))
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    return (
        <div className="flex flex-col gap-1 w-full">
            <div role="button"
                onClick={() => setHeight(!height)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={'group cursor-pointer gap-1 w-full pl-1 h-7 flex items-center rounded-xs border bg-background opacity-85 hover:opacity-100 transition-all overflow-x-hidden'}
                style={{ backgroundColor: `${hexToRgba(isHovered ? 0.8 : 0.5, folder.color)}` }}
            >
                <ChevronDown className={`${height === true ? 'rotate-0' : '-rotate-90'} w-4 h-4 shrink-0 opacity-85 group-hover:opacity-100 transition-all`} />
                <div className={`relative w-full h-full flex items-center justify-center gap-2 transition-all overflow-x-hidden ${className}`}>
                    {/* Text + Icon */}
                    {!height ? <FolderIcon className="w-4 h-4 shrink-0 transition-all" /> : <FolderOpen className="w-4 h-4 shrink-0 transition-all" />}
                    <h1 className="text-left text-sm transition-all w-full truncate">
                        {folder.name}
                    </h1>
                    <div className="flex items-center justify-center absolute right-1 gap-1">
                        <ButtonMenuFolder folder={folder} />
                    </div>
                </div>
            </div>
            {height && hasContent && (
                <div className="relative w-full">
                    <div className="absolute left-[12px] top-0 bottom-0 w-px bg-foreground/15" />
                    <div className="ml-[26px] flex flex-col gap-1">
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
}