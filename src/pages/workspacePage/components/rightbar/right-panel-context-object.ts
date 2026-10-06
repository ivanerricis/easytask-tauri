import { createContext } from "react"
import type { AudioFile } from "@/types/types"
import type { RightPanelTab } from "@/lib/store/preferences"

export type RightPanelContextType = {
    /** Whether the panel is shown (in a compact window this is the overlay state, which is not persisted). */
    open: boolean
    setOpen: (value: boolean) => void
    tab: RightPanelTab
    setTab: (tab: RightPanelTab) => void
    /** Selects the task in the active note, then opens the panel on its details. */
    showTaskDetails: (taskId: number) => void
    /** The audio file chosen with "Information" in its menu; null means the file loaded in the player is shown. */
    audioInfoFile: AudioFile | null
    /** Chooses the file whose information is shown, then opens the panel on the details tab. */
    showAudioInfo: (file: AudioFile) => void
}

export const RightPanelContext = createContext<RightPanelContextType | null>(null)
