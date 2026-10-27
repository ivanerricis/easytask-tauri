import i18n from "@/i18n"
import { toast } from "sonner"

/** A toast with a button ("Annulla", "Mostra") stays long enough to reach it (sonner pauses it while the pointer is over it). */
export const ACTION_TOAST_DURATION = 8000

/**
 * Tells that `count` items went to the trash. With `undo` (the item is in the undo history) the toast has the button to bring
 * them back: it undoes the last action, so it is meant for the toast shown right after the delete.
 */
export function toastTrashed(count: number, undo?: () => Promise<void>) {
    toast.success(i18n.t("dialogs.delete.done", { count }), undo
        ? { duration: ACTION_TOAST_DURATION, action: { label: i18n.t("undo.undo"), onClick: () => { void undo() } } }
        : undefined)
}
