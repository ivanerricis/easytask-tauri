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
    getShowSubtaskCount,
    saveShowSubtaskCount,
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
    getColorIntensity,
    getHideCompletedTasks,
    saveHideCompletedTasks,
    saveColorIntensity,
    saveLanguage,
    type SidebarItemSize,
    type WorkspaceView
} from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"
import { applyLanguagePreference, type LanguagePreference } from "@/i18n"
import type { AudioPlayerPosition } from "@/types/types"
import { DEFAULT_COLOR_INTENSITY, clampColorIntensity } from "@/lib/color-intensity"
import { SIDEBAR_DEFAULT_WIDTH, clampSidebarWidth } from "@/lib/sidebar-layout"
import { PreferencesContext } from "./preferences-context-object"

const AUDIO_PLAYER_WIDTH = 350
const AUDIO_PLAYER_HEIGHT = 82

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [showProgressBar, setShowProgressBarState] = useState(true)
    const [showGroupProgressBar, setShowGroupProgressBarState] = useState(true)
    const [showSectionCount, setShowSectionCountState] = useState(true)
    const [showTaskCount, setShowTaskCountState] = useState(true)
    const [showSubtaskCount, setShowSubtaskCountState] = useState(true)
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
    const [colorIntensity, setColorIntensityState] = useState(DEFAULT_COLOR_INTENSITY)
    const [language, setLanguageState] = useState<LanguagePreference>("system")
    const [hideCompletedTasks, setHideCompletedTasksState] = useState(false)
    const audioPlayerContainerRef =useRef<HTMLDivElement>(null)
    const positionRef = useRef<AudioPlayerPosition>(audioPlayerPosition)
    const scaleRef = useRef<AudioPlayerScale>(audioPlayerScale)

    useEffect(() => {
        scaleRef.current = audioPlayerScale
    }, [audioPlayerScale])

    /** Brings a position inside the container of the player (the window while it is not mounted). */
    const fitPosition = (position: AudioPlayerPosition, scale: AudioPlayerScale = scaleRef.current): AudioPlayerPosition => {
        const container = audioPlayerContainerRef.current
        const width = container?.offsetWidth || window.innerWidth
        const height = container?.offsetHeight || window.innerHeight
        const x = Math.max(0, Math.min(position.x, width - AUDIO_PLAYER_WIDTH * scale))
        const y = Math.max(0, Math.min(position.y, height - AUDIO_PLAYER_HEIGHT * scale))
        return x === position.x && y === position.y ? position : { ...position, x, y }
    }
    const fitPositionRef = useRef(fitPosition)
    useEffect(() => {
        fitPositionRef.current = fitPosition
    })

    // A smaller window must not leave the player outside of it
    useEffect(() => {
        const onResize = () => {
            const current = positionRef.current
            const fitted = fitPositionRef.current(current)
            if (fitted === current) return
            positionRef.current = fitted
            setAudioPlayerPositionState(fitted)
            saveAudioPlayerPosition(fitted).catch(reportError)
        }
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])

    useEffect(() => {
        getShowProgressBar().then(setShowProgressBarState).catch(reportError)
        getShowGroupProgressBar().then(setShowGroupProgressBarState).catch(reportError)
        getShowSectionCount().then(setShowSectionCountState).catch(reportError)
        getShowTaskCount().then(setShowTaskCountState).catch(reportError)
        getShowSubtaskCount().then(setShowSubtaskCountState).catch(reportError)
        getSideBarLeftOpen().then(setSidebarLeftOpenState).catch(reportError)
        getSideBarRightOpen().then(setSidebarRightOpenState).catch(reportError)
        getAudioPlayerPosition().then(position => {
            const fitted = fitPositionRef.current(position)
            positionRef.current = fitted
            setAudioPlayerPositionState(fitted)
        }).catch(reportError)
        getAudioVolume().then(setAudioVolumeState).catch(reportError)
        getAudioPlayerVisible().then(setAudioPlayerVisibleState).catch(reportError)
        getAudioPlayerScale().then(setAudioPlayerScaleState).catch(reportError)
        getAudioPlayerOpacity().then(setAudioPlayerOpacityState).catch(reportError)
        getWorkspaceView().then(setWorkspaceViewState).catch(reportError)
        getReopenNotes().then(setReopenNotesState).catch(reportError)
        getReopenLastWorkspace().then(setReopenLastWorkspaceState).catch(reportError)
        getSidebarItemSize().then(setSidebarItemSizeState).catch(reportError)
        getSidebarLeftWidth().then(setSidebarLeftWidthState).catch(reportError)
        getSidebarRightWidth().then(setSidebarRightWidthState).catch(reportError)
        getRightPanelTab().then(setRightPanelTabState).catch(reportError)
        getColorIntensity().then(setColorIntensityState).catch(reportError)
        getLanguage().then(value => {
            setLanguageState(value)
            void applyLanguagePreference(value)
        }).catch(reportError)
        getPrimaryColor().then(hex => {
            setPrimaryColorState(hex)
            document.documentElement.style.setProperty('--primary', hex)
        }).catch(reportError)
        getHideCompletedTasks().then(setHideCompletedTasksState).catch(reportError)
    }, [])

    const setShowProgressBar = (value: boolean) => {
        setShowProgressBarState(value)
        saveShowProgressBar(value).catch(reportError)
    }

    const setShowGroupProgressBar = (value: boolean) => {
        setShowGroupProgressBarState(value)
        saveShowGroupProgressBar(value).catch(reportError)
    }

    const setShowSectionCount = (value: boolean) => {
        setShowSectionCountState(value)
        saveShowSectionCount(value).catch(reportError)
    }

    const setShowTaskCount = (value: boolean) => {
        setShowTaskCountState(value)
        saveShowTaskCount(value).catch(reportError)
    }

    const setShowSubtaskCount = (value: boolean) => {
        setShowSubtaskCountState(value)
        saveShowSubtaskCount(value).catch(reportError)
    }

    const setPrimaryColor = (hex: string) => {
        setPrimaryColorState(hex)
        document.documentElement.style.setProperty('--primary', hex)
        savePrimaryColor(hex).catch(reportError)
    }

    const setSideBarLeftOpen = (value: boolean) => {
        setSidebarLeftOpenState(value)
        saveSideBarLeftOpen(value).catch(reportError)
    }

    const setSideBarRightOpen = (value: boolean) => {
        setSidebarRightOpenState(value)
        saveSideBarRightOpen(value).catch(reportError)
    }

    const setWorkspaceView = (value: WorkspaceView) => {
        setWorkspaceViewState(value)
        saveWorkspaceView(value).catch(reportError)
    }

    const setReopenNotes = (value: boolean) => {
        setReopenNotesState(value)
        saveReopenNotes(value).catch(reportError)
    }

    const setReopenLastWorkspace = (value: boolean) => {
        setReopenLastWorkspaceState(value)
        saveReopenLastWorkspace(value).catch(reportError)
    }

    const setSidebarItemSize = (value: SidebarItemSize) => {
        setSidebarItemSizeState(value)
        saveSidebarItemSize(value).catch(reportError)
    }

    const setSidebarLeftWidth = (value: number) => {
        const width = clampSidebarWidth(value)
        setSidebarLeftWidthState(width)
        saveSidebarLeftWidth(width).catch(reportError)
    }

    const setSidebarRightWidth = (value: number) => {
        const width = clampSidebarWidth(value)
        setSidebarRightWidthState(width)
        saveSidebarRightWidth(width).catch(reportError)
    }

    const setRightPanelTab = (value: RightPanelTab) => {
        setRightPanelTabState(value)
        saveRightPanelTab(value).catch(reportError)
    }

    const setColorIntensity = (value: number) => {
        const intensity = clampColorIntensity(value)
        setColorIntensityState(intensity)
        saveColorIntensity(intensity).catch(reportError)
    }

    const setLanguage = (value: LanguagePreference) => {
        setLanguageState(value)
        void applyLanguagePreference(value)
        saveLanguage(value).catch(reportError)
    }

    const setAudioVolume = (value: number) => {
        const volume = clampAudioVolume(value)
        setAudioVolumeState(volume)
        saveAudioVolume(volume).catch(reportError)
    }

    const setAudioPlayerVisible = (value: boolean) => {
        setAudioPlayerVisibleState(value)
        saveAudioPlayerVisible(value).catch(reportError)
    }

    const setAudioPlayerScale = (value: AudioPlayerScale) => {
        const scale = normalizeAudioPlayerScale(value)
        setAudioPlayerScaleState(scale)
        saveAudioPlayerScale(scale).catch(reportError)
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
        saveAudioPlayerOpacity(opacity).catch(reportError)
    }

    const resetAudioSettings = () => {
        setAudioVolume(DEFAULT_AUDIO_VOLUME)
        setAudioPlayerVisible(true)
        setAudioPlayerScale(DEFAULT_AUDIO_PLAYER_SCALE)
        setAudioPlayerOpacity(DEFAULT_AUDIO_PLAYER_OPACITY)
    }

    const setAudioPlayerPosition =(position: AudioPlayerPosition) => {
        setAudioPlayerPositionState(position)
        positionRef.current = position
        saveAudioPlayerPosition(position).catch(reportError)
    }

    const resetPlayerPosition = () => {
        resetAudioPlayerPosition().catch(reportError)
        const container = audioPlayerContainerRef.current
        if (!container) return

        const playerWidth = AUDIO_PLAYER_WIDTH * audioPlayerScale
        const playerHeight = AUDIO_PLAYER_HEIGHT * audioPlayerScale

        // Computed once and set once (setAudioPlayerPosition also saves it)
        setAudioPlayerPosition({
            x: container.offsetWidth / 2 - playerWidth / 2,
            y: container.offsetHeight - playerHeight,
            scaleX: 1,
            scaleY: 1
        })
    }

    const setHideCompletedTasks = (value: boolean) => {
        setHideCompletedTasksState(value)
        saveHideCompletedTasks(value).catch(reportError)
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
            showSubtaskCount,
            setShowSubtaskCount,
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
            colorIntensity,
            setColorIntensity,
            language,
            setLanguage,
            hideCompletedTasks,
            setHideCompletedTasks
        }}>
            {children}
        </PreferencesContext.Provider>
    )
}
