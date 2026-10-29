import { useIsFocusedPane } from "@/contexts/use-layout"
import { useAnnouncement } from "./note-announcer-store"

/** Live region (screen readers only) that reads what `announce` receives, e.g. where a task has been moved. Only the pane with the focus renders it, so a message is read once. */
export const NoteAnnouncer = () => {
    const message = useAnnouncement()
    const focused = useIsFocusedPane()
    if (!focused) return null
    return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{message}</div>
}
