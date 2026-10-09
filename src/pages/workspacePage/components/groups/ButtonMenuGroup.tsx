import { useTranslation } from "react-i18next"
import { lazyWithPreload, preloadWhenIdle } from "@/lib/lazy-preload"
import { ButtonInPopover } from "@/components/button-in-popover";
import { DialogDeleteItem } from "@/components/dialogs/dialog-delete";
import { MenuGroup } from "@/components/menu-kind";
import { Separator } from "@/components/ui/separator";
import { ColorSubmenu } from "../ColorSubmenu";
import { useWorkspaceActions } from "@/contexts/workspace-data";
import type { DBItemType } from "@/db/queries/shared_queries";
import { ItemMenu } from "@/components/item-menu";
import { useItemMenuState } from "@/hooks/use-item-menu-state";
import { useRenameAfterClose } from "@/hooks/use-rename-after-close";
import { useActiveNoteActions } from "@/contexts/use-active-note";
import { useAudio } from "@/contexts/use-audio";
import { GroupStepMoves } from "../NoteStepMoves";
import type { Group } from "@/types/types";
import { useState, type ReactElement } from "react";
import { useUndoRecorder } from "@/contexts/undo/use-undo";
import { withRollback } from "@/contexts/with-rollback";
import { getErrorMessage } from "@/lib/utils";
import { reportError } from "@/lib/report-error";
import { LazyMount } from "@/components/lazy-mount";
import { useActiveNoteId } from "@/contexts/use-tabs";

const DialogAutomations = lazyWithPreload(() => import("@/components/dialogs/dialog-automations").then(m => ({ default: m.DialogAutomations })))
preloadWhenIdle(DialogAutomations)

type Props = {
    group: Group
    /** The group header: right click on it opens this menu, its <ItemMenuButton /> opens it below the button. */
    /** Starts the inline edit of the name (once the menu has given the focus back). */
    onRename?: () => void
    children: ReactElement
}

export const ButtonMenuGroup = ({ group, onRename, children }: Props) => {
    const { t } = useTranslation()
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const [isAutomationsOpen, setAutomationsOpen] = useState(false)
    const noteId = useActiveNoteId()
    const menu = useItemMenuState()
    const { requestRename, onCloseAutoFocus } = useRenameAfterClose(onRename)
    const { patchGroup, removeGroup } = useActiveNoteActions()
    const { addFiles } = useAudio()
    const { updateItemColor, archiveItem } = useWorkspaceActions()
    const recorder = useUndoRecorder()

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

    // Removed from the open note at once (put back if the write fails); no confirmation, undo brings it back
    const handleArchive = async () => {
        menu.close()
        try {
            await withRollback(removeGroup(group.id), () => archiveItem("section_group", group.id))
            recorder.archive("section_group", group.id, group.name)
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text={t("common.rename")}
                type="rename"
                onClick={() => {
                    requestRename()
                    menu.close()
                }}
            />
            <ColorSubmenu
                item={group}
                itemType="section_group"
                addColorItem={addColorItem}
                onDone={menu.close}
            />
            <GroupStepMoves groupId={group.id} onDone={menu.close} />
            <ButtonInPopover
                text={t("audio.add")}
                type="addAudio"
                onClick={() => {
                    menu.close()
                    void addFiles(group.id)
                }}
            />
            {noteId !== null && <ButtonInPopover
                text={t("automations.menu")}
                type="automations"
                onClick={() => {
                    setAutomationsOpen(true)
                    menu.close()
                }}
            />}
            <ButtonInPopover
                text={t("menu.archive")}
                type="archive"
                onClick={handleArchive}
            />
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
            {noteId !== null && <LazyMount active={isAutomationsOpen}>
                <DialogAutomations
                    noteId={noteId}
                    groupId={group.id}
                    isOpen={isAutomationsOpen}
                    onOpenChange={setAutomationsOpen}
                />
            </LazyMount>}
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
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs" onCloseAutoFocus={onCloseAutoFocus}>
            {children}
        </ItemMenu>
    );
}
