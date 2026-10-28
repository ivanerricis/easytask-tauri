import { useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogRenameItem } from "@/components/dialogs/dialog-rename"
import { DialogNoteFromTemplate } from "@/components/dialogs/dialog-note-from-template"
import { ItemMenu } from "@/components/item-menu"
import { MenuGroup } from "@/components/menu-kind"
import { Separator } from "@/components/ui/separator"
import { useTabsActions } from "@/contexts/use-tabs"
import { useTemplateDraftActions } from "@/contexts/use-template-drafts"
import { setDBTemplateDraftColor, type TemplateDraft } from "@/db/queries/template-draft"
import { getDBTemplate } from "@/db/queries/template"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { getErrorMessage } from "@/lib/utils"
import { reportError } from "@/lib/report-error"
import type { NoteTemplate } from "@/types/template"
import { ColorSubmenu } from "../ColorSubmenu"

type DraftTabMenuProps = {
    draft: TemplateDraft
    /** The tab: right click on it opens this menu. */
    children: ReactElement
}

/**
 * The menu of the tab of a template editor: the actions of the template (rename, color, create a note from it) and
 * closing the editor. It has no delete, archive, move or duplicate: the draft is not a note of the workspace.
 */
export const DraftTabMenu = ({ draft, children }: DraftTabMenuProps) => {
    const { t } = useTranslation()
    const menu = useItemMenuState()
    const { closeNote } = useTabsActions()
    const { flushTemplate, refreshDrafts } = useTemplateDraftActions()
    const [renaming, setRenaming] = useState(false)
    const [creatingFrom, setCreatingFrom] = useState<NoteTemplate | null>(null)

    const handleColor = async (color: string | null) => {
        await setDBTemplateDraftColor(draft.noteId, color)
        await refreshDrafts()
    }

    // The template is saved first, so the new note has what the editor shows
    const handleCreateNote = async () => {
        menu.close()
        try {
            if (!await flushTemplate(draft.templateId)) throw new Error(t("templateEditor.saveError"))
            const template = await getDBTemplate(draft.templateId)
            if (template) setCreatingFrom(template)
        } catch (error) {
            reportError(error, getErrorMessage(error))
        }
    }

    const items = (
        <MenuGroup className="flex flex-col gap-1">
            <ButtonInPopover
                text={t("templateEditor.tabMenu.rename")}
                type="rename"
                onClick={() => { setRenaming(true); menu.close() }}
            />
            <ColorSubmenu
                item={{ id: draft.noteId, color: draft.color }}
                onPick={handleColor}
                onDone={menu.close}
            />
            <Separator />
            <ButtonInPopover
                text={t("templateEditor.tabMenu.createNote")}
                type="addNote"
                onClick={handleCreateNote}
            />
            <Separator />
            <ButtonInPopover
                text={t("templateEditor.tabMenu.closeEditor")}
                type="close"
                onClick={() => { closeNote(draft.noteId); menu.close() }}
            />
        </MenuGroup>
    )

    const dialogs = (
        <>
            {renaming && (
                <DialogRenameItem
                    item={{ id: draft.templateId, name: draft.templateName }}
                    itemType="note_template"
                    isOpen
                    onOpenChange={open => { if (!open) setRenaming(false) }}
                    getItemId={draft.templateId}
                    getItemData={refreshDrafts}
                />
            )}
            {creatingFrom && (
                <DialogNoteFromTemplate
                    template={creatingFrom}
                    isOpen
                    onOpenChange={open => { if (!open) setCreatingFrom(null) }}
                />
            )}
        </>
    )

    return (
        <ItemMenu state={menu} items={items} dialogs={dialogs} contentClassName="p-1 rounded-xs">
            {children}
        </ItemMenu>
    )
}
