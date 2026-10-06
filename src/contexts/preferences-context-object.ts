import { createContext } from "react"
import type { AudioPlayerScale, RightPanelTab, SidebarItemSize, WorkspaceSort, WorkspaceView } from "@/lib/store/preferences"
import type { LanguagePreference } from "@/i18n"
import type { AudioPlayerPosition } from "@/types/types"

export type PreferencesContextType = {
    showProgressBar: boolean
    setShowProgressBar: (value: boolean) => void
    showGroupProgressBar: boolean
    setShowGroupProgressBar: (value: boolean) => void
    showSectionCount: boolean
    setShowSectionCount: (value: boolean) => void
    showAudioFileCount: boolean
    setShowAudioFileCount: (value: boolean) => void
    showGroupSeparators: boolean
    setShowGroupSeparators: (value: boolean) => void
    undoLimit: number
    setUndoLimit: (value: number) => void
    showTaskCount: boolean
    setShowTaskCount: (value: boolean) => void
    showSubtaskCount: boolean
    setShowSubtaskCount: (value: boolean) => void
    primaryColor: string
    setPrimaryColor: (value: string) => void
    sidebarLeftOpen: boolean
    setSideBarLeftOpen: (value: boolean) => void
    sidebarRightOpen: boolean
    setSideBarRightOpen: (value: boolean) => void
    audioPlayerPosition: AudioPlayerPosition
    audioPlayerContainerRef: React.RefObject<HTMLDivElement | null>
    setAudioPlayerPosition: (position: AudioPlayerPosition) => void
    resetPlayerPosition: () => void
    audioVolume: number
    setAudioVolume: (value: number) => void
    audioPlayerVisible: boolean
    setAudioPlayerVisible: (value: boolean) => void
    audioPlayerScale: AudioPlayerScale
    setAudioPlayerScale: (value: AudioPlayerScale) => void
    audioPlayerOpacity: number
    setAudioPlayerOpacity: (value: number) => void
    resetAudioSettings: () => void
    workspaceView: WorkspaceView
    setWorkspaceView: (value: WorkspaceView) => void
    workspaceSort: WorkspaceSort
    setWorkspaceSort: (value: WorkspaceSort) => void
    reopenNotes: boolean
    setReopenNotes: (value: boolean) => void
    reopenLastWorkspace: boolean
    setReopenLastWorkspace: (value: boolean) => void
    sidebarItemSize: SidebarItemSize
    setSidebarItemSize: (value: SidebarItemSize) => void
    sidebarLeftWidth: number
    setSidebarLeftWidth: (value: number) => void
    sidebarRightWidth: number
    setSidebarRightWidth: (value: number) => void
    rightPanelTab: RightPanelTab
    setRightPanelTab: (value: RightPanelTab) => void
    colorIntensity: number
    setColorIntensity: (value: number) => void
    language: LanguagePreference
    setLanguage: (value: LanguagePreference) => void
    /** Whether the completed tasks (with their subtasks) are hidden in the notes. */
    hideCompletedTasks: boolean
    setHideCompletedTasks: (value: boolean) => void
}

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)
