import { useEffect, useRef, useState } from "react"
import {
    getPrimaryColor,
    savePrimaryColor,
    getShowProgressBar,
    saveShowProgressBar,
    getShowGroupProgressBar,
    saveShowGroupProgressBar,
    getShowSectionCount,
    saveShowSectionCount,
    getShowTaskCount,
    saveShowTaskCount,
    saveSideBarLeftOpen,
    saveSideBarRightOpen,
    getSideBarLeftOpen,
    getSideBarRightOpen,
    saveAudioPlayerPosition,
    getAudioPlayerPosition,
    resetAudioPlayerPosition,
    getAudioVolume,
    saveAudioVolume,
    getAudioPlayerVisible,
    saveAudioPlayerVisible,
    getAudioPlayerScale,
    saveAudioPlayerScale,
    getAudioPlayerOpacity,
    saveAudioPlayerOpacity,
    clampAudioVolume,
    clampAudioPlayerOpacity,
    normalizeAudioPlayerScale,
    DEFAULT_AUDIO_VOLUME,
    DEFAULT_AUDIO_PLAYER_SCALE,
    DEFAULT_AUDIO_PLAYER_OPACITY,
    type AudioPlayerScale,
    getWorkspaceView,
    saveWorkspaceView,
    getReopenNotes,
    saveReopenNotes,
    getReopenLastWorkspace,
    saveReopenLastWorkspace,
    getSidebarItemSize,
    saveSidebarItemSize,
    getSidebarLeftWidth,
    saveSidebarLeftWidth,
    getSidebarRightWidth,
    saveSidebarRightWidth,
    getRightPanelTab,
    saveRightPanelTab,
    type RightPanelTab,
    getLanguage,
    saveLanguage,
    type SidebarItemSize,
    type WorkspaceView
} from "@/lib/store/preferences"
import { applyLanguagePreference, type LanguagePreference } from "@/i18n"
import type { AudioPlayerPosition } from "@/types/types"
import { SIDEBAR_DEFAULT_WIDTH, clampSidebarWidth } from "@/lib/sidebar-layout"
import { PreferencesContext } from "./preferences-context-object"

const AUDIO_PLAYER_WIDTH = 350
const AUDIO_PLAYER_HEIGHT = 82

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [showProgressBar, setShowProgressBarState] = useState(true)
    const [showGroupProgressBar, setShowGroupProgressBarState] = useState(true)
    const [showSectionCount, setShowSectionCountState] = useState(true)
    const [showTaskCount, setShowTaskCountState] = useState(true)
    const [primaryColor, setPrimaryColorState] = useState("#ffb375")
    const [sidebarLeftOpen, setSidebarLeftOpenState] = useState(true)
    const [sidebarRightOpen, setSidebarRightOpenState] = useState(true)
    const [audioPlayerPosition, setAudioPlayerPositionState] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
    const [audioVolume, setAudioVolumeState] = useState(DEFAULT_AUDIO_VOLUME)
    const [audioPlayerVisible, setAudioPlayerVisibleState] = useState(true)
    const [audioPlayerScale, setAudioPlayerScaleState] = useState<AudioPlayerScale>(DEFAULT_AUDIO_PLAYER_SCALE)
    const [audioPlayerOpacity, setAudioPlayerOpacityState] = useState(DEFAULT_AUDIO_PLAYER_OPACITY)
    const [workspaceView, setWorkspaceViewState] = useState<WorkspaceView>("grid")
    const [reopenNotes, setReopenNotesState] = useState(true)
    const [reopenLastWorkspace, setReopenLastWorkspaceState] = useState(false)
    const [sidebarItemSize, setSidebarItemSizeState] = useState<SidebarItemSize>("normal")
    const [sidebarLeftWidth, setSidebarLeftWidthState] = useState(SIDEBAR_DEFAULT_WIDTH)
    const [sidebarRightWidth, setSidebarRightWidthState] = useState(SIDEBAR_DEFAULT_WIDTH)
    const [rightPanelTab, setRightPanelTabState] = useState<RightPanelTab>("details")
    const [language, setLanguageState] = useState<LanguagePreference>("system")
    const audioPlayerContainerRef =useRef<HTMLDivElement>(null)

    useEffect(() => {
        getShowProgressBar().then(setShowProgressBarState)
        getShowGroupProgressBar().then(setShowGroupProgressBarState)
        getShowSectionCount().then(setShowSectionCountState)
        getShowTaskCount().then(setShowTaskCountState)
        getSideBarLeftOpen().then(setSidebarLeftOpenState)
        getSideBarRightOpen().then(setSidebarRightOpenState)
        getAudioPlayerPosition().then(setAudioPlayerPositionState)
        getAudioVolume().then(setAudioVolumeState)
        getAudioPlayerVisible().then(setAudioPlayerVisibleState)
        getAudioPlayerScale().then(setAudioPlayerScaleState)
        getAudioPlayerOpacity().then(setAudioPlayerOpacityState)
        getWorkspaceView().then(setWorkspaceViewState)
        getReopenNotes().then(setReopenNotesState)
        getReopenLastWorkspace().then(setReopenLastWorkspaceState)
        getSidebarItemSize().then(setSidebarItemSizeState)
        getSidebarLeftWidth().then(setSidebarLeftWidthState)
        getSidebarRightWidth().then(setSidebarRightWidthState)
        getRightPanelTab().then(setRightPanelTabState)
        getLanguage().then(value => {
            setLanguageState(value)
            void applyLanguagePreference(value)
        })
        getPrimaryColor().then(hex => {
            setPrimaryColorState(hex)
            document.documentElement.style.setProperty('--primary', hex)
        })
    }, [])

    const setShowProgressBar = (value: boolean) => {
        setShowProgressBarState(value)
        saveShowProgressBar(value)
    }

    const setShowGroupProgressBar = (value: boolean) => {
        setShowGroupProgressBarState(value)
        saveShowGroupProgressBar(value)
    }

    const setShowSectionCount = (value: boolean) => {
        setShowSectionCountState(value)
        saveShowSectionCount(value)
    }

    const setShowTaskCount = (value: boolean) => {
        setShowTaskCountState(value)
        saveShowTaskCount(value)
    }

    const setPrimaryColor = (hex: string) => {
        setPrimaryColorState(hex)
        document.documentElement.style.setProperty('--primary', hex)
        savePrimaryColor(hex)
    }

    const setSideBarLeftOpen = (value: boolean) => {
        setSidebarLeftOpenState(value)
        saveSideBarLeftOpen(value)
    }

    const setSideBarRightOpen = (value: boolean) => {
        setSidebarRightOpenState(value)
        saveSideBarRightOpen(value)
    }

    const setWorkspaceView = (value: WorkspaceView) => {
        setWorkspaceViewState(value)
        saveWorkspaceView(value)
    }

    const setReopenNotes = (value: boolean) => {
        setReopenNotesState(value)
        saveReopenNotes(value)
    }

    const setReopenLastWorkspace = (value: boolean) => {
        setReopenLastWorkspaceState(value)
        saveReopenLastWorkspace(value)
    }

    const setSidebarItemSize = (value: SidebarItemSize) => {
        setSidebarItemSizeState(value)
        saveSidebarItemSize(value)
    }

    const setSidebarLeftWidth = (value: number) => {
        const width = clampSidebarWidth(value)
        setSidebarLeftWidthState(width)
        saveSidebarLeftWidth(width)
    }

    const setSidebarRightWidth = (value: number) => {
        const width = clampSidebarWidth(value)
        setSidebarRightWidthState(width)
        saveSidebarRightWidth(width)
    }

    const setRightPanelTab = (value: RightPanelTab) => {
        setRightPanelTabState(value)
        saveRightPanelTab(value)
    }

    const setLanguage = (value: LanguagePreference) => {
        setLanguageState(value)
        void applyLanguagePreference(value)
        saveLanguage(value)
    }

    const setAudioVolume = (value: number) => {
        const volume = clampAudioVolume(value)
        setAudioVolumeState(volume)
        saveAudioVolume(volume)
    }

    const setAudioPlayerVisible = (value: boolean) => {
        setAudioPlayerVisibleState(value)
        saveAudioPlayerVisible(value)
    }

    const setAudioPlayerScale = (value: AudioPlayerScale) => {
        const scale = normalizeAudioPlayerScale(value)
        setAudioPlayerScaleState(scale)
        saveAudioPlayerScale(scale)
        // A bigger player must not overflow the window: pull it back inside
        const container = audioPlayerContainerRef.current
        if (!container) return
        const x = Math.max(0, Math.min(audioPlayerPosition.x, container.offsetWidth - AUDIO_PLAYER_WIDTH * scale))
        const y = Math.max(0, Math.min(audioPlayerPosition.y, container.offsetHeight - AUDIO_PLAYER_HEIGHT * scale))
        if (x !== audioPlayerPosition.x || y !== audioPlayerPosition.y)
            setAudioPlayerPosition({ ...audioPlayerPosition, x, y })
    }

    const setAudioPlayerOpacity = (value: number) => {
        const opacity = clampAudioPlayerOpacity(value)
        setAudioPlayerOpacityState(opacity)
        saveAudioPlayerOpacity(opacity)
    }

    const resetAudioSettings = () => {
        setAudioVolume(DEFAULT_AUDIO_VOLUME)
        setAudioPlayerVisible(true)
        setAudioPlayerScale(DEFAULT_AUDIO_PLAYER_SCALE)
        setAudioPlayerOpacity(DEFAULT_AUDIO_PLAYER_OPACITY)
    }

    const setAudioPlayerPosition =(position: AudioPlayerPosition) => {
        setAudioPlayerPositionState(position)
        saveAudioPlayerPosition(position)
    }

    const resetPlayerPosition = () => {
        resetAudioPlayerPosition()
        const container = audioPlayerContainerRef.current
        if (!container) return

        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight
        const playerWidth = AUDIO_PLAYER_WIDTH * audioPlayerScale
        const playerHeight = AUDIO_PLAYER_HEIGHT * audioPlayerScale

        const newPosition = {
            x: containerWidth / 2 - playerWidth / 2,
            y: containerHeight - playerHeight,
            scaleX: 1,
            scaleY: 1
        }

        setAudioPlayerPosition(newPosition)
        saveAudioPlayerPosition(newPosition)
        setAudioPlayerPositionState(newPosition)
    }

    return (
        <PreferencesContext.Provider value={{
            showProgressBar,
            setShowProgressBar,
            showGroupProgressBar,
            setShowGroupProgressBar,
            showSectionCount,
            setShowSectionCount,
            showTaskCount,
            setShowTaskCount,
            primaryColor,
            setPrimaryColor,
            sidebarLeftOpen,
            setSideBarLeftOpen,
            sidebarRightOpen,
            setSideBarRightOpen,
            audioPlayerPosition,
            audioPlayerContainerRef,
            setAudioPlayerPosition,
            resetPlayerPosition,
            audioVolume,
            setAudioVolume,
            audioPlayerVisible,
            setAudioPlayerVisible,
            audioPlayerScale,
            setAudioPlayerScale,
            audioPlayerOpacity,
            setAudioPlayerOpacity,
            resetAudioSettings,
            workspaceView,
            setWorkspaceView,
            reopenNotes,
            setReopenNotes,
            reopenLastWorkspace,
            setReopenLastWorkspace,
            sidebarItemSize,
            setSidebarItemSize,
            sidebarLeftWidth,
            setSidebarLeftWidth,
            sidebarRightWidth,
            setSidebarRightWidth,
            rightPanelTab,
            setRightPanelTab,
            language,
            setLanguage
        }}>
            {children}
        </PreferencesContext.Provider>
    )
}
