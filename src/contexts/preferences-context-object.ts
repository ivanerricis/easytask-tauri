import { createContext } from "react"
import type { PrefValue, UiPrefName } from "@/lib/store/preferences"
import type { AudioPlayerPosition } from "@/types/types"

/** The name of the setter of a preference (setShowProgressBar for showProgressBar; the sidebar ones keep their capital B). */
export type PrefSetterName<K extends string> =
    K extends "sidebarLeftOpen" ? "setSideBarLeftOpen"
    : K extends "sidebarRightOpen" ? "setSideBarRightOpen"
    : `set${Capitalize<K>}`

export type PreferencesContextType = {
    [K in UiPrefName]: PrefValue<K>
} & {
    [K in UiPrefName as PrefSetterName<K>]: (value: PrefValue<K>) => void
} & {
    primaryColor: string
    setPrimaryColor: (value: string) => void
    audioPlayerPosition: AudioPlayerPosition
    audioPlayerContainerRef: React.RefObject<HTMLDivElement | null>
    /** Called by the mounted player with its real size (zoom included), null when it unmounts. */
    reportAudioPlayerSize: (size: { width: number; height: number } | null) => void
    setAudioPlayerPosition: (position: AudioPlayerPosition) => void
    resetPlayerPosition: () => void
    resetAudioSettings: () => void
}

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)
