import { useTranslation } from "react-i18next"
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
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

type ButtonMenuSectionProps = {
    section: Section
    /** The section header: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    children: ReactElement
}

export const ButtonMenuSection = ({ section, children }: ButtonMenuSectionProps) => {
    const { t } = useTranslation()
    const [isRenameOpen, setRenameOpen] = useState(false)
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const menu = useItemMenuState()
    const { updateItemColor, duplicateSection } = useWorkspaceActions()
    const { patchSection, removeSection, refreshActiveNote } = useActiveNoteActions()
    const recorder = useUndoRecorder()

    // The copy is placed right after the original: reload the open note to show it
    const handleDuplicate = async () => {
        menu.close()
        try {
            const id = await duplicateSection(section.id)
            recorder.create("section", id, null)
            await refreshActiveNote()
            toast.success(t("duplicate.sectionDone"))
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

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
                text={t("common.rename")}
                type="rename"
                onClick={() => {
                    setRenameOpen(true)
                    menu.close()
                }}
            />
            <ButtonInPopover
                text={t("menu.duplicate")}
                type="duplicate"
                onClick={handleDuplicate}
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
