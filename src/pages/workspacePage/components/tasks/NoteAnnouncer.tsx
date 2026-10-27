import { useAnnouncement } from "./note-announcer-store"

/** Live region (screen readers only) that reads what `announce` receives, e.g. where a task has been moved. */
export const NoteAnnouncer = () => (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{useAnnouncement()}</div>
)
