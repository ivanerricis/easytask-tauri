import { useContext, useEffect, useState } from "react"
import type { AudioFile } from "@/types/types"
import { AudioContext } from "@/contexts/audio-context-object"
import { getDBGroupAudioFiles } from "@/db/queries/audio"
import { usePreferences } from "@/contexts/use-preferences"
import { useActiveNoteId, useSelectTask } from "@/contexts/use-tabs"
import { useCompactLayout } from "@/lib/sidebar-layout"
import { RightPanelContext } from "./right-panel-context-object"

/**
 * State of the right panel: open/closed (persisted; in a compact window it is a closed-by-default overlay that is
 * not persisted, like the left sidebar) and the active tab (persisted). Must be inside the preferences and tabs providers.
 * @category RightPanel
 */
export function RightPanelProvider({ children }: { children: React.ReactNode }) {
    const { sidebarRightOpen, setSideBarRightOpen, rightPanelTab, setRightPanelTab } = usePreferences()
    const compact = useCompactLayout()
    const selectTask = useSelectTask()
    const activeNoteId = useActiveNoteId()
    // Optional: the panel also works (without a chosen file) where there is no audio provider
    const audioVersion = useContext(AudioContext)?.version
    const [audioInfoFile, setAudioInfoFile] = useState<AudioFile | null>(null)
    const [prevNoteId, setPrevNoteId] = useState(activeNoteId)
    if (prevNoteId !== activeNoteId) {
        setPrevNoteId(activeNoteId)
        setAudioInfoFile(null)
    }
    const [overlayOpen, setOverlayOpen] = useState(false)
    const [prevCompact, setPrevCompact] = useState(compact)
    if (prevCompact !== compact) {
        setPrevCompact(compact)
        setOverlayOpen(false)
    }

    const open = compact ? overlayOpen : sidebarRightOpen
    const setOpen = (value: boolean) => {
        if (compact) setOverlayOpen(value)
        else setSideBarRightOpen(value)
    }
    const showTaskDetails = (taskId: number) => {
        selectTask(taskId)
        setRightPanelTab("details")
        setOpen(true)
    }

    const showAudioInfo = (file: AudioFile) => {
        setAudioInfoFile(file)
        setRightPanelTab("details")
        setOpen(true)
    }

    // The chosen file that was deleted or trashed is dropped (the loaded track is shown again); a renamed or
    // relinked one is refreshed. Runs when the audio files may have changed.
    const chosenId = audioInfoFile?.id
    const chosenGroupId = audioInfoFile?.section_groupID
    useEffect(() => {
        if (chosenId === undefined || chosenGroupId === undefined) return
        let stale = false
        getDBGroupAudioFiles(chosenGroupId)
            .then(files => {
                if (stale) return
                const current = files.find(file => file.id === chosenId)
                setAudioInfoFile(previous => {
                    if (!previous || previous.id !== chosenId) return previous
                    if (!current) return null
                    return previous.name === current.name && previous.path === current.path ? previous : current
                })
            })
            .catch(() => { })
        return () => { stale = true }
    }, [chosenId, chosenGroupId, audioVersion])

    return (
        <RightPanelContext.Provider value={{ open, setOpen, tab: rightPanelTab, setTab: setRightPanelTab, showTaskDetails, audioInfoFile, showAudioInfo }}>
            {children}
        </RightPanelContext.Provider>
    )
}
