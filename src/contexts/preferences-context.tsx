import { createContext, useContext, useEffect, useRef, useState } from "react"
import {
    getPrimaryColor,
    savePrimaryColor,
    getShowProgressBar,
    saveShowProgressBar,
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
    getWorkspaceView,
    saveWorkspaceView,
    type WorkspaceView
} from "@/lib/store/preferences"
import type { AudioPlayerPosition } from "@/types/types"

type PreferencesContextType = {
    showProgressBar: boolean
    setShowProgressBar: (value: boolean) => void
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
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [showProgressBar, setShowProgressBarState] = useState(true)
    const [showSectionCount, setShowSectionCountState] = useState(true)
    const [showTaskCount, setShowTaskCountState] = useState(true)
    const [primaryColor, setPrimaryColorState] = useState("#ffb375")
    const [sidebarLeftOpen, setSidebarLeftOpenState] = useState(true)
    const [sidebarRightOpen, setSidebarRightOpenState] = useState(true)
    const [audioPlayerPosition, setAudioPlayerPositionState] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
    const [workspaceView, setWorkspaceViewState] = useState<WorkspaceView>("grid")
    const audioPlayerContainerRef =useRef<HTMLDivElement>(null)

    useEffect(() => {
        getShowProgressBar().then(setShowProgressBarState)
        getShowSectionCount().then(setShowSectionCountState)
        getShowTaskCount().then(setShowTaskCountState)
        getSideBarLeftOpen().then(setSidebarLeftOpenState)
        getSideBarRightOpen().then(setSidebarRightOpenState)
        getAudioPlayerPosition().then(setAudioPlayerPositionState)
        getWorkspaceView().then(setWorkspaceViewState)
        getPrimaryColor().then(hex => {
            setPrimaryColorState(hex)
            document.documentElement.style.setProperty('--primary', hex)
        })
    }, [])

    const setShowProgressBar = (value: boolean) => {
        setShowProgressBarState(value)
        saveShowProgressBar(value)
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
        const playerWidth = 350
        const playerHeight = 82

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
            workspaceView,
            setWorkspaceView
        }}>
            {children}
        </PreferencesContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePreferences = () => {
    const context = useContext(PreferencesContext)
    if (!context) throw new Error("usePreferences must be used within a PreferencesProvider")
    return context
}