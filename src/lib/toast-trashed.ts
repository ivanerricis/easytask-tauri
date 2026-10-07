import i18n from "@/i18n"
import { toast } from "sonner"

/**
 * Tells that `count` items went to the trash. With `undo` (the item is in the undo history) the toast has the button to bring
 * them back: it undoes the last action, so it is meant for the toast shown right after the delete.
 */
export function toastTrashed(count: number, undo?: () => Promise<void>) {
    toast.success(i18n.t("dialogs.delete.done", { count }), undo
        ? { action: { label: i18n.t("undo.undo"), onClick: () => { void undo() } } }
        : undefined)
}
