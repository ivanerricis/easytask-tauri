import { useIsActiveDraft } from "@/contexts/use-template-drafts"
import { NoteOrTaskDetails } from "./details/NoteDetails"
import { AudioDetails } from "./details/AudioDetails"

/**
 * The Details tab, split in two halves with their own scroll: the selected task (or the active note) on top, the
 * information of the audio file below (content-sized, up to 40% of the panel).
 * @category RightPanel
 */
export function DetailsPanel() {
    // A template draft has no audio
    const isDraft = useIsActiveDraft()
    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto"><NoteOrTaskDetails /></div>
            {!isDraft && <AudioDetails />}
        </div>
    )
}
