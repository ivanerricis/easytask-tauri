import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogRenameItem } from "@/components/dialogs/dialog-rename";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { MenuGroup } from "@/components/menu-kind";
import { ItemMenu } from "@/components/item-menu";
import { useItemMenuState } from "@/hooks/use-item-menu-state";
import { useActiveNoteActions } from "@/contexts/active-note-context";
import { useAudio } from "@/contexts/audio-context";
import type { Group } from "@/types/types";
import { useState, type ReactElement } from "react";

type Props = {
    group: Group
    /** The group header: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuGroup = ({ group, children }: Props) => {
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const menu = useItemMenuState()
    const { patchGroup, removeGroup } = useActiveNoteActions()
    const { addFiles } = useAudio()

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text="Rinomina"
                type="rename"
                onClick={() => {
                    setRenameOpen(true)
                    menu.close()
                }}
            />
            <ButtonInPopover
                text="Aggiungi file audio"
                type="addAudio"
                onClick={() => {
                    menu.close()
                    void addFiles(group.id)
                }}
            />
            <ButtonInPopover
                text="Elimina"
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
