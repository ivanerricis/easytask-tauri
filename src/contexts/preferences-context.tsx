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
    getWorkspaceView,
    saveWorkspaceView,
    getReopenNotes,
    saveReopenNotes,
    getReopenLastWorkspace,
    saveReopenLastWorkspace,
    getSidebarItemSize,
    saveSidebarItemSize,
    getLanguage,
    saveLanguage,
    type SidebarItemSize,
    type WorkspaceView
} from "@/lib/store/preferences"
import { applyLanguagePreference, type LanguagePreference } from "@/i18n"
import type { AudioPlayerPosition } from "@/types/types"
import { PreferencesContext } from "./preferences-context-object"

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [showProgressBar, setShowProgressBarState] = useState(true)
    const [showGroupProgressBar, setShowGroupProgressBarState] = useState(true)
    const [showSectionCount, setShowSectionCountState] = useState(true)
    const [showTaskCount, setShowTaskCountState] = useState(true)
    const [primaryColor, setPrimaryColorState] = useState("#ffb375")
    const [sidebarLeftOpen, setSidebarLeftOpenState] = useState(true)
    const [sidebarRightOpen, setSidebarRightOpenState] = useState(true)
    const [audioPlayerPosition, setAudioPlayerPositionState] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
    const [workspaceView, setWorkspaceViewState] = useState<WorkspaceView>("grid")
    const [reopenNotes, setReopenNotesState] = useState(true)
    const [reopenLastWorkspace, setReopenLastWorkspaceState] = useState(false)
    const [sidebarItemSize, setSidebarItemSizeState] = useState<SidebarItemSize>("normal")
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
        getWorkspaceView().then(setWorkspaceViewState)
        getReopenNotes().then(setReopenNotesState)
        getReopenLastWorkspace().then(setReopenLastWorkspaceState)
        getSidebarItemSize().then(setSidebarItemSizeState)
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

    const setLanguage = (value: LanguagePreference) => {
        setLanguageState(value)
        void applyLanguagePreference(value)
        saveLanguage(value)
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
            workspaceView,
            setWorkspaceView,
            reopenNotes,
            setReopenNotes,
            reopenLastWorkspace,
            setReopenLastWorkspace,
            sidebarItemSize,
            setSidebarItemSize,
            language,
            setLanguage
        }}>
            {children}
        </PreferencesContext.Provider>
    )
}
