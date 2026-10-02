import { useTranslation } from "react-i18next"
import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogRenameItem } from "@/components/dialogs/dialog-rename";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { MenuGroup, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind";
import { DialogAddColor } from "@/components/dialogs/dialog-add-color";
import { useWorkspaceActions } from "@/contexts/workspace-data";
import type { DBItemType } from "@/db/queries/shared_queries";
import { ItemMenu } from "@/components/item-menu";
import { useItemMenuState } from "@/hooks/use-item-menu-state";
import { useActiveNoteActions } from "@/contexts/use-active-note";
import { useAudio } from "@/contexts/use-audio";
import { GroupStepMoves } from "../NoteStepMoves";
import type { Group } from "@/types/types";
import { useState, type ReactElement } from "react";

type Props = {
    group: Group
    /** The group header: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuGroup = ({ group, children }: Props) => {
    const { t } = useTranslation()
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const menu = useItemMenuState()
    const { patchGroup, removeGroup } = useActiveNoteActions()
    const { addFiles } = useAudio()
    const { updateItemColor } = useWorkspaceActions()

    // The color is applied to the cached note at once and restored if the write fails (the dialog shows the error)
    const addColorItem = async (itemType: DBItemType, itemId: number, color?: string) => {
        const rollback = patchGroup(itemId, { color: color ?? null })
        try {
            await updateItemColor(itemType, itemId, color)
        } catch (error) {
            rollback()
            throw error
        }
    }

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text={t("common.rename")}
                type="rename"
                onClick={() => {
                    setRenameOpen(true)
                    menu.close()
                }}
            />
            <MenuSub>
                <MenuSubTrigger>
                    <ButtonInPopover
                        text={t("menu.changeColor")}
                        type="color"
                    />
                </MenuSubTrigger>
                <MenuSubContent>
                    <DialogAddColor
                        item={group}
                        itemType="section_group"
                        addColorItem={addColorItem}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
            <GroupStepMoves groupId={group.id} onDone={menu.close} />
            <ButtonInPopover
                text={t("audio.add")}
                type="addAudio"
                onClick={() => {
                    menu.close()
                    void addFiles(group.id)
                }}
            />
            <ButtonInPopover
                text={t("common.delete")}
                type="delete"
                destructive
                onClick={() => {
                    setDeleteOpen(true)
                    menu.close()
                }}
            />
        </MenuGroup>
    )

    const dialogs = (
        <>
            <DialogRenameItem
                key={group.name ?? ""}
                item={group}
                itemType="section_group"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                optimistic={name => patchGroup(group.id, { name: name || null })}
            />
            <DialogDeleteItem
                item={group}
                itemType="section_group"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                optimistic={() => removeGroup(group.id)}
            />
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    );
}
