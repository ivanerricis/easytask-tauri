import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { ButtonInPopover } from "@/components/button-in-popover"
import { ItemMenu } from "@/components/item-menu"
import { MenuGroup } from "@/components/menu-kind"
import { usePreferences } from "@/contexts/use-preferences"
import { useShortcutKeys } from "@/contexts/use-shortcuts"
import { useAfterMenuClose } from "@/hooks/use-after-menu-close"
import { useItemMenuState } from "@/hooks/use-item-menu-state"
import { requestAppCommand } from "@/lib/app-commands"

type NoteBackgroundMenuProps = {
    /** The note area: a right click on it, where no group, section or task takes it, opens this menu. */
    children: ReactElement
}

const newGroup = () => requestAppCommand("new-group")

/**
 * Right click on the empty space of the note: a new group and the show/hide of the completed tasks.
 * The menus of a group, a section and a task win over this one.
 * @category Groups
 */
export const NoteBackgroundMenu = ({ children }: NoteBackgroundMenuProps) => {
    const { t } = useTranslation()
    const menu = useItemMenuState()
    const { hideCompletedTasks, setHideCompletedTasks } = usePreferences()
    const hideKeys = useShortcutKeys("toggle-hide-completed")
    // The form of the new group takes the focus: the command waits for the menu to give it back, or it would steal it
    const { request: requestNewGroup, onCloseAutoFocus } = useAfterMenuClose(newGroup)

    const items = (
        <MenuGroup className="flex flex-col gap-1 p-1">
            <ButtonInPopover text={t("menu.newGroup")} type="addGroup" onClick={() => { requestNewGroup(); menu.close() }} />
            <ButtonInPopover
                text={hideCompletedTasks ? t("notes.showCompleted") : t("notes.hideCompleted")}
                type={hideCompletedTasks ? "showCompleted" : "hideCompleted"}
                shortcut={hideKeys}
                onClick={() => { menu.close(); setHideCompletedTasks(!hideCompletedTasks) }}
            />
        </MenuGroup>
    )

    return <ItemMenu state={menu} items={items} onCloseAutoFocus={onCloseAutoFocus}>{children}</ItemMenu>
}
