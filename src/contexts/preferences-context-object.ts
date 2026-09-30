import { createContext } from "react"
import type { SidebarItemSize, WorkspaceView } from "@/lib/store/preferences"
import type { AudioPlayerPosition } from "@/types/types"

export type PreferencesContextType = {
    showProgressBar: boolean
    setShowProgressBar: (value: boolean) => void
    showGroupProgressBar: boolean
    setShowGroupProgressBar: (value: boolean) => void
    showSectionCount: boolean
    setShowSectionCount: (value: boolean) => void
    showTaskCount: boolean
    setShowTaskCount: (value: boolean) => void
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
    workspaceView: WorkspaceView
    setWorkspaceView: (value: WorkspaceView) => void
    reopenNotes: boolean
    setReopenNotes: (value: boolean) => void
    reopenLastWorkspace: boolean
    setReopenLastWorkspace: (value: boolean) => void
    sidebarItemSize: SidebarItemSize
    setSidebarItemSize: (value: SidebarItemSize) => void
}

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)
