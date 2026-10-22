import i18n from "@/i18n"
import { toast } from "sonner"
import { purgeDBTrashOlderThan } from "@/db/queries/trash"
import { getTrashAutoEmptyDays } from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"

/**
 * Startup job: permanently deletes what has been in the trash for longer than the "trashAutoEmptyDays" preference
 * (all workspaces) and tells how many items went. Best effort: a failure is only reported, it never blocks the start.
 * Does nothing when the preference is "never" (0).
 * @category Database Queries
 */
export async function runTrashAutoEmpty(): Promise<void> {
    try {
        const days = await getTrashAutoEmptyDays()
        if (days <= 0) return
        const count = await purgeDBTrashOlderThan(days)
        if (count > 0) toast.success(i18n.t("settings.data.trashAutoEmpty.done", { count, days }))
    } catch (error: unknown) {
        reportError(error)
    }
}
