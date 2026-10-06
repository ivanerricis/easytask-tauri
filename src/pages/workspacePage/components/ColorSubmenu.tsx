import { useTranslation } from "react-i18next"
import { MenuSub, MenuSubContent, MenuSubTrigger } from "@/components/menu-kind"
import { ButtonInPopover } from "@/components/button-in-popover"
import { DialogAddColor, type DialogAddColorProps } from "@/components/dialogs/dialog-add-color"

type ColorSubmenuProps<T> = Omit<DialogAddColorProps<T>, "setDropDownOpen" | "className"> & {
    /** Closes the menu once a color is picked. */
    onDone?: () => void
}

/** "Cambia colore" submenu: the color palette of an item, shared by the item menus. */
export const ColorSubmenu = <T extends { id: number, color?: string | null }>({ onDone, ...props }: ColorSubmenuProps<T>) => {
    const { t } = useTranslation()
    return (
        <MenuSub>
            <MenuSubTrigger>
                <ButtonInPopover text={t("menu.changeColor")} type="color" />
            </MenuSubTrigger>
            <MenuSubContent>
                <DialogAddColor {...props} setDropDownOpen={onDone} />
            </MenuSubContent>
        </MenuSub>
    )
}
