import { usePreferences } from "@/contexts/use-preferences"
import type { SidebarItemSize } from "@/lib/store/preferences"

/**
 * Class names for the folder and note rows of the sidebar, one entry per size.
 * Full class names (no interpolation) so Tailwind can see them.
 * "normal" is the original look: h-7, text-sm, size-4 icons.
 */
export type ItemSizeClasses = {
    /** Row height. */
    row: string
    /** Row height in px (matches `row`), for virtualization. */
    rowPx: number
    /** Indent per depth level in px (matches `indent`). */
    indentPx: number
    /** Row label. */
    text: string
    /** Row icons (chevron, folder, note). */
    icon: string
    /** Resizes the icon of the hover menu button. */
    menu: string
    /** Vertical indent guide of an open folder (aligned with the chevron). */
    guide: string
    /** Indent of the children of an open folder. */
    indent: string
    /** Tooltip offsets that clear the hover menu button (note row / folder row). */
    noteTooltipOffset: number
    folderTooltipOffset: number
}

export const ITEM_SIZES: Record<SidebarItemSize, ItemSizeClasses> = {
    compact: {
        row: "h-6",
        rowPx: 24,
        indentPx: 16,
        text: "text-xs",
        icon: "size-3.5",
        menu: "[&_svg]:size-3.5",
        guide: "left-[11px]",
        indent: "ml-[16px]",
        noteTooltipOffset: 31,
        folderTooltipOffset: 35,
    },
    normal: {
        row: "h-7",
        rowPx: 28,
        indentPx: 17,
        text: "text-sm",
        icon: "size-4",
        menu: "",
        guide: "left-[12px]",
        indent: "ml-[17px]",
        noteTooltipOffset: 33,
        folderTooltipOffset: 37,
    },
    large: {
        row: "h-9",
        rowPx: 36,
        indentPx: 19,
        text: "text-base",
        icon: "size-5",
        menu: "[&_svg]:size-5",
        guide: "left-[14px]",
        indent: "ml-[19px]",
        noteTooltipOffset: 37,
        folderTooltipOffset: 41,
    },
}

/** Size classes for the size chosen in the settings. */
export const useItemSize = (): ItemSizeClasses => ITEM_SIZES[usePreferences().sidebarItemSize]
