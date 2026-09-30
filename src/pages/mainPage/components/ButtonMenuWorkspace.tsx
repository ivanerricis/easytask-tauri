import { useState, type ReactElement } from "react";
import type { Workspace } from "@/types/types";
import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogRenameItem } from "@/components/dialogs/dialog-rename";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { DialogAddColor } from "@/components/dialogs/dialog-add-color";
import { useWorkspace } from "@/contexts/workspace-context";
import { useWorkspaceData } from "@/contexts/workspace-data-context";
import { MenuGroup, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind";
import { ItemMenu } from "@/components/item-menu";
import { useItemMenuState } from "@/hooks/use-item-menu-state";

type ButtonMenuProps = {
    workspace: Workspace
    /** The workspace card: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
};

export const ButtonMenuWorkspace = ({ workspace, children }: ButtonMenuProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const menu = useItemMenuState();

    const { getWorkspaces } = useWorkspace();
    const { updateItemColor } = useWorkspaceData();

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text="Rinomina"
                type="rename"
                onClick={() => {
                    setRenameOpen(true);
                    menu.close();
                }}
            />

            <MenuSub>
                <MenuSubTrigger>
                    <ButtonInPopover
                        text="Cambia colore"
                        type="color"
                    />
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor
                        item={workspace}
                        itemType="workspace"
                        addColorItem={updateItemColor}
                        getItemId={workspace.id}
                        getItemData={getWorkspaces}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
            <MenuSeparator />
            <ButtonInPopover
                text="Elimina"
                type="delete"
                destructive
                onClick={() => {
                    setDeleteOpen(true);
                    menu.close();
                }}
            />
        </MenuGroup>
    );

    const dialogs = (
        <>
            <DialogRenameItem
                item={workspace}
                itemType="workspace"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                getItemData={getWorkspaces}
                getItemId={workspace.id}
            />

            <DialogDeleteItem
                item={workspace}
                itemType="workspace"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                getItemData={getWorkspaces}
            />
        </>
    );

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    );
};
