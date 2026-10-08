import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { reportError } from "@/lib/report-error"
import { Folder as FolderIcon, FolderInput } from "lucide-react"
import { MenuItem, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { getErrorMessage } from "@/lib/utils"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { captureTreePlace } from "@/contexts/undo/commands"
import { END_INDEX, getMoveDestinations, type TreeItemType } from "./sidebar/tree-dnd"

type MoveToSubmenuProps = {
    itemType: TreeItemType
    itemId: number
    folderID: number | null
    onDone?: () => void
}

/** "Sposta in…" submenu: accessible alternative to drag & drop. Moves the item to the end of the destination. */
export const MoveToSubmenu = ({ itemType, itemId, folderID, onDone }: MoveToSubmenuProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { workspaceDataTree, moveTreeItem, getWorkspaceData } = useWorkspaceData()
    const recorder = useUndoRecorder()

    const destinations = useMemo(() => getMoveDestinations(
        { rootFolders: workspaceDataTree?.rootFolders ?? [], rootNotes: workspaceDataTree?.rootNotes ?? [] },
        { type: itemType, id: itemId, folderID },
    ), [workspaceDataTree, itemType, itemId, folderID])

    if (destinations.length === 0) return null

    const move = async (targetFolderId: number | null) => {
        onDone?.()
        try {
            const from = captureTreePlace(workspaceDataTree, itemType, itemId)
            await moveTreeItem(itemType, itemId, targetFolderId, END_INDEX)
            if (from) recorder.treeMove(itemType, itemId, from.name, { folderId: from.folderId, index: from.index }, { folderId: targetFolderId, index: END_INDEX })
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
        if (currentWorkspace) {
            try {
                await getWorkspaceData(currentWorkspace.id)
            } catch (err) {
                reportError(err, t("errors.refreshTree"))
            }
        }
    }

    return (
        <MenuSub>
            <MenuSubTrigger>
                <FolderInput className="size-4" />
                {t("menu.moveTo")}
            </MenuSubTrigger>
            <MenuSubContent className="max-h-64 overflow-y-auto">
                {destinations.map(destination => (
                    <MenuItem
                        key={destination.id ?? "root"}
                        className="text-xs"
                        style={{ paddingLeft: `${0.5 + destination.depth * 0.75}rem` }}
                        onSelect={() => { void move(destination.id) }}
                    >
                        {destination.id == null ? <FolderInput className="size-4" /> : <FolderIcon className="size-4" />}
                        <span className="truncate">{destination.name ?? t("common.workspaceRoot")}</span>
                    </MenuItem>
                ))}
            </MenuSubContent>
        </MenuSub>
    )
}
