import { useState, type ReactElement } from "react"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogAddColor } from "@/components/dialogs/dialog-add-color"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { Section } from "@/types/types"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { Separator } from "@/components/ui/separator"
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { SectionMoveSubmenu } from "../NoteMoveSubmenus"
import { MenuGroup, MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { ItemMenu } from "@/components/item-menu"
import { useItemMenuState } from "@/hooks/use-item-menu-state"

type ButtonMenuSectionProps = {
    section: Section
    /** The section header: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuSection = ({ section, children }: ButtonMenuSectionProps) => {
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const menu = useItemMenuState()
    const { updateItemColor } = useWorkspaceActions()
    const { patchSection, removeSection } = useActiveNoteActions()

    // The color is applied to the cached tree at once and restored if the write fails
    const addColorItem = async (itemType: DBItemType, itemId: number, color?: string) => {
        const rollback = patchSection(itemId, { color: color ?? null })
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
                text="Rinomina"
                type="rename"
                onClick={() => {
                    setRenameOpen(true)
                    menu.close()
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
                        item={section}
                        itemType="section"
                        addColorItem={addColorItem}
                        setDropDownOpen={menu.close}
                    />
                </MenuSubContent>
            </MenuSub>
            <SectionMoveSubmenu sectionId={section.id} onDone={menu.close} />
            <Separator />
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
                item={section}
                itemType="section"
                isOpen={isRenameOpen}
                onOpenChange={setRenameOpen}
                optimistic={title => patchSection(section.id, { title })}
            />
            <DialogDeleteItem
                item={section}
                itemType="section"
                isOpen={isDeleteOpen}
                onOpenChange={setDeleteOpen}
                optimistic={() => removeSection(section.id)}
            />
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    )
}
