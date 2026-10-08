import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { Folder as FolderIcon, FolderInput, Palette } from "lucide-react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import { MenuGroup, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { Separator } from "@/components/ui/separator"
import { useWorkspaceData } from "@/contexts/workspace-data"
import type { ItemMenuState } from "@/hooks/use-item-menu-state"
import { getTopMostItems } from "./selection"
import { useSelectedKeys, useSelectionStore } from "./selection-context"
import { useSelectionActions } from "./selection-actions"
import { getMultiMoveDestinations } from "./tree-multi-move"

/**
 * Entries of the menu of a selected row while 2 or more items are selected: move, color, export, archive and delete,
 * all applied to the whole selection (see {@link SelectionActionsProvider}). Written once for the "…" button and the right click.
 */
export const SelectionMenuItems = ({ menu }: { menu: ItemMenuState }) => {
    const { t } = useTranslation()
    const store = useSelectionStore()
    const actions = useSelectionActions()
    const { workspaceDataTree } = useWorkspaceData()
    const selected = useSelectedKeys()

    // Without the actions provider a multi menu cannot exist (the row never asks for it)
    const tree = useMemo(
        () => ({ rootFolders: workspaceDataTree?.rootFolders ?? [], rootNotes: workspaceDataTree?.rootNotes ?? [] }),
        [workspaceDataTree],
    )
    const targets = useMemo(
        () => getTopMostItems(tree, store?.getRefs() ?? []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tree, store, selected],
    )
    const destinations = useMemo(() => getMultiMoveDestinations(tree, targets), [tree, targets])
    if (!actions) return null

    return (
        <MenuGroup className="flex flex-col gap-1">
            {destinations.length > 0 && (
                <MenuSub>
                    <MenuSubTrigger>
                        <FolderInput className="size-4" />
                        {t("menu.selection.move")}
                    </MenuSubTrigger>
                    <MenuSubContent className="max-h-64 overflow-y-auto">
                        {destinations.map(destination => (
                            <MenuItem
                                key={destination.id ?? "root"}
                                className="text-xs"
                                style={{ paddingLeft: `${0.5 + destination.depth * 0.75}rem` }}
                                onSelect={() => { menu.close(); void actions.moveTo(destination.id) }}
                            >
                                {destination.id == null ? <FolderInput className="size-4" /> : <FolderIcon className="size-4" />}
                                <span className="truncate">{destination.name ?? t("common.workspaceRoot")}</span>
                            </MenuItem>
                        ))}
                    </MenuSubContent>
                </MenuSub>
            )}
            <MenuSub>
                <MenuSubTrigger>
                    <Palette className="size-4" />
                    {t("menu.selection.color")}
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor onPick={color => actions.applyColor(color)} setDropDownOpen={menu.close} />
                </MenuSubContent>
            </MenuSub>
            <ButtonInPopover
                text={t("menu.selection.export")}
                type="export"
                onClick={() => { menu.close(); void actions.exportSelection() }}
            />
            <ButtonInPopover
                text={t("menu.selection.archive", { count: targets.length })}
                type="archive"
                onClick={() => { menu.close(); void actions.archiveSelection() }}
            />
            <Separator />
            <ButtonInPopover
                text={t("menu.selection.delete", { count: targets.length })}
                type="delete"
                destructive
                onClick={() => { menu.close(); actions.requestDelete() }}
            />
        </MenuGroup>
    )
}
