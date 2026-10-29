import { useAfterMenuClose } from "./use-after-menu-close"

/**
 * The "Rename" entry of an item menu starts the inline edit, but only once the menu has given the focus back,
 * otherwise the input would lose it at once.
 * @returns `requestRename` to call from the entry (after closing the menu) and `onCloseAutoFocus` for the {@link ItemMenu}.
 * @category Hooks
 */
export function useRenameAfterClose(onRename?: () => void) {
    const { request, onCloseAutoFocus } = useAfterMenuClose(onRename)
    return { requestRename: request, onCloseAutoFocus }
}
