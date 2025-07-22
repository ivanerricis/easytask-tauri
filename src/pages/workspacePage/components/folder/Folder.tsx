import { ChevronDown, Folder as FolderIcon, FolderOpen } from "lucide-react"
import React, { useState } from "react"
import { ButtonMenuFolder } from "./ButtonMenuFolder"
import type { Folder } from "@/types/types"
import { DialogAddColor } from "../section/dialogs/DialogAddColor"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { useWorkspace } from "@/contexts/workspace-context"

type ItemFolderProps = {
    folder: Folder
    className?: string
    children?: React.ReactNode
}

export const ItemFolder = ({ folder, className, children }: ItemFolderProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const [height, setHeight] = useState(true)
    const [isColorOpen, setIsColorOpen] = useState(false)
    const { currentWorkspace } = useWorkspace()
    const { updateItemColor, getWorkspaceData } = useWorkspaceData()

    const hasContent = React.Children.count(children) > 0

    function hexToRgba(alpha: number, hex?: string) {
        const match = hex?.replace('#', '').match(/.{1,2}/g)
        if (!match) return hex
        const [r, g, b] = match.map(x => parseInt(x, 16))
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    return (
        <div className="relative flex">
            <div className="flex flex-col gap-1 w-full">
                <div role="button"
                    onClick={() => setHeight(!height)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={'group cursor-pointer gap-1 w-full pl-1 h-7 flex items-center rounded-xs border bg-background opacity-85 hover:opacity-100 overflow-x-hidden'}
                    style={{ backgroundColor: `${hexToRgba(isHovered ? 0.8 : 0.5, folder.color)}` }}
                >
                    <ChevronDown className={`${height === true ? 'rotate-0' : '-rotate-90'} w-4 h-4 shrink-0 opacity-85 group-hover:opacity-100 transition-all`} />
                    <div className={`relative w-full h-full flex items-center justify-center gap-2 transition-all overflow-x-hidden ${className}`}>
                        {/* Text + Icon */}
                        {!height ? <FolderIcon className="w-4 h-4 shrink-0" /> : <FolderOpen className="w-4 h-4 shrink-0" />}
                        <h1 className="text-left text-sm w-full truncate pr-7">
                            {folder.name}
                        </h1>
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <ButtonMenuFolder
                                folder={folder}
                                onChangeColor={() => setIsColorOpen(true)}
                            />
                        </div>
                    </div>
                </div>
                {height && hasContent && (
                    <div className="relative w-full">
                        <div className="absolute left-[12px] top-0 bottom-0 w-[1px] bg-foreground/15" />
                        <div className="ml-[26px] flex flex-col gap-1">
                            {children}
                        </div>
                    </div>
                )}
            </div>

            <DialogAddColor
                item={folder}
                itemType="folder"
                isOpen={isColorOpen}
                onOpenChange={setIsColorOpen}
                addColorItem={updateItemColor}
                getItemId={currentWorkspace?.id}
                getItemData={getWorkspaceData}
            />
        </div>
    )
}