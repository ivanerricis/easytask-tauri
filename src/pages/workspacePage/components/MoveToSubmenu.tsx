import { useMemo } from "react"
import { toast } from "sonner"
import { Folder as FolderIcon, FolderInput } from "lucide-react"
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu"
import { ButtonInPopover } from "@/components/button-in-popover"
import { useWorkspace } from "@/contexts/workspace-context"
import { useWorkspaceData } from "@/contexts/workspace-data-context"
import { getErrorMessage } from "@/lib/utils"
import { END_INDEX, getMoveDestinations, type TreeItemType } from "./sidebar/tree-dnd"

type MoveToSubmenuProps = {
    itemType: TreeItemType
    itemId: number
    folderID: number | null
    onDone?: () => void
}

/** "Sposta in…" submenu: accessible alternative to drag & drop. Moves the item to the end of the destination. */
export const MoveToSubmenu = ({ itemType, itemId, folderID, onDone }: MoveToSubmenuProps) => {
    const { currentWorkspace } = useWorkspace()
    const { workspaceDataTree, moveTreeItem, getWorkspaceData } = useWorkspaceData()

    const destinations = useMemo(() => getMoveDestinations(
        { rootFolders: workspaceDataTree?.rootFolders ?? [], rootNotes: workspaceDataTree?.rootNotes ?? [] },
        { type: itemType, id: itemId, folderID },
    ), [workspaceDataTree, itemType, itemId, folderID])

    if (destinations.length === 0) return null

    const move = async (targetFolderId: number | null) => {
        onDone?.()
        try {
            await moveTreeItem(itemType, itemId, targetFolderId, END_INDEX)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
        if (currentWorkspace) {
            try {
                await getWorkspaceData(currentWorkspace.id)
            } catch (err) {
                console.error(err)
            }
        }
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <ButtonInPopover text="Sposta in…" type="move" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                {destinations.map(destination => (
                    <DropdownMenuItem
                        key={destination.id ?? "root"}
                        className="text-xs"
                        style={{ paddingLeft: `${0.5 + destination.depth * 0.75}rem` }}
                        onSelect={() => { void move(destination.id) }}
                    >
                        {destination.id == null ? <FolderInput className="size-4" /> : <FolderIcon className="size-4" />}
                        <span className="truncate">{destination.name ?? "Radice del workspace"}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    )
}
